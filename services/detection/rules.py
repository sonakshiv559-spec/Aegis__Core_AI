"""
AegisCore AI – Deterministic Rule Evaluation Engine
Loads YAML-based detection rules and evaluates OCSF events against condition trees.
"""

from __future__ import annotations

import glob
import ipaddress
import os
import re
from typing import Any, Dict, List, Optional
import structlog
import yaml

from schemas.ocsf import OCSFEvent

logger = structlog.get_logger()


def get_nested_field(obj: Any, path: str) -> Any:
    """Extracts a value from an OCSFEvent or dict using dot notation."""
    parts = path.split(".")
    curr = obj
    for part in parts:
        if curr is None:
            return None
        if isinstance(curr, dict):
            curr = curr.get(part)
        elif hasattr(curr, part):
            curr = getattr(curr, part)
        else:
            return None
    return curr


def check_ip_in_cidr(ip_str: Optional[str], cidr_list: List[str]) -> bool:
    if not ip_str:
        return False
    try:
        ip = ipaddress.ip_address(ip_str)
        for cidr in cidr_list:
            if ip in ipaddress.ip_network(cidr, strict=False):
                return True
    except ValueError:
        return False
    return False


def evaluate_condition(event: OCSFEvent, cond: Dict[str, Any]) -> bool:
    field_path = cond.get("field", "")
    val = get_nested_field(event, field_path)
    op = cond.get("op", "eq").lower()

    if op == "eq":
        return str(val).lower() == str(cond.get("value")).lower()
    elif op == "ne":
        return str(val).lower() != str(cond.get("value")).lower()
    elif op == "in":
        target_vals = [str(x).lower() for x in cond.get("values", [])]
        return str(val).lower() in target_vals
    elif op == "not_in":
        target_vals = [str(x).lower() for x in cond.get("values", [])]
        return str(val).lower() not in target_vals
    elif op == "in_cidr":
        return check_ip_in_cidr(str(val) if val else None, cond.get("values", []))
    elif op == "not_in_cidr":
        return not check_ip_in_cidr(str(val) if val else None, cond.get("values", []))
    elif op == "contains":
        substr = str(cond.get("value", "")).lower()
        return substr in str(val or "").lower()
    elif op == "regex":
        pattern = cond.get("pattern", "")
        if not val or not pattern:
            return False
        return bool(re.search(pattern, str(val)))
    elif op == "is_null":
        return val is None or val == ""
    elif op == "not_null":
        return val is not None and val != ""

    return False


class DetectionRule:
    def __init__(self, raw_dict: Dict[str, Any]):
        self.raw = raw_dict
        self.id: str = raw_dict.get("id", "UNKNOWN-RULE")
        self.name: str = raw_dict.get("name", "Unnamed Rule")
        self.description: str = raw_dict.get("description", "").strip()
        self.severity: str = raw_dict.get("severity", "MEDIUM")
        self.event_class: str = raw_dict.get("event_class", "")
        self.activity_names: List[str] = raw_dict.get("activity_names", [])
        self.conditions: Dict[str, Any] = raw_dict.get("conditions", {})
        self.threat_indicators: List[Dict[str, Any]] = raw_dict.get("threat_indicators", [])
        self.score_contributions: Dict[str, Any] = raw_dict.get("score_contributions", {})
        self.mitre_attack: Dict[str, Any] = raw_dict.get("mitre_attack", {})
        self.policy_version: str = raw_dict.get("policy_version", "v1.0.0")

    def matches(self, event: OCSFEvent) -> bool:
        # Check event_class if specified
        if self.event_class and event.event_class != self.event_class:
            return False

        # Check activity_name if specified
        if self.activity_names and event.activity_name not in self.activity_names:
            return False

        # Check 'all' conditions (conjunction)
        all_conds = self.conditions.get("all", [])
        for c in all_conds:
            if not evaluate_condition(event, c):
                return False

        # Check 'any' conditions (disjunction)
        any_conds = self.conditions.get("any", [])
        if any_conds:
            matched_any = any(evaluate_condition(event, c) for c in any_conds)
            if not matched_any:
                return False

        return True


class RuleMatchResult:
    def __init__(
        self,
        rule: DetectionRule,
        event: OCSFEvent,
        threat_confidence: float,
        anomaly_score: float,
        evidence_predicates: List[str],
    ):
        self.rule = rule
        self.event = event
        self.threat_confidence = threat_confidence
        self.anomaly_score = anomaly_score
        self.evidence_predicates = evidence_predicates


class RuleEngine:
    def __init__(self, rules_dir: Optional[str] = None):
        self.rules: List[DetectionRule] = []
        if rules_dir:
            self.load_rules(rules_dir)
        else:
            default_dir = os.path.join(os.path.dirname(__file__), "rule_definitions")
            if os.path.exists(default_dir):
                self.load_rules(default_dir)

    def load_rules(self, rules_dir: str) -> None:
        yaml_files = glob.glob(os.path.join(rules_dir, "*.yaml")) + glob.glob(
            os.path.join(rules_dir, "*.yml")
        )
        self.rules = []
        for yf in yaml_files:
            try:
                with open(yf, "r", encoding="utf-8") as f:
                    docs = yaml.safe_load_all(f)
                    for d in docs:
                        if d and "id" in d:
                            self.rules.append(DetectionRule(d))
            except Exception as e:
                logger.error("aegiscore.rules.load_failed", file=yf, error=str(e))
        logger.info("aegiscore.rules.loaded", count=len(self.rules))

    def evaluate(self, event: OCSFEvent) -> List[RuleMatchResult]:
        matches: List[RuleMatchResult] = []
        for rule in self.rules:
            if rule.matches(event):
                # Calculate threat confidence dynamically based on matched threat indicators
                base_conf = float(rule.score_contributions.get("threat_confidence_base", 0.6))
                extra_conf = 0.0
                for indicator in rule.threat_indicators:
                    weight = float(indicator.get("weight", 0.1))
                    field_val = get_nested_field(event, indicator.get("field", ""))
                    pattern = indicator.get("pattern")
                    if pattern and field_val and re.search(pattern, str(field_val)):
                        extra_conf += weight
                    elif not pattern and field_val:
                        extra_conf += weight

                final_conf = min(1.0, base_conf + extra_conf)
                anomaly_sc = float(rule.score_contributions.get("anomaly_score", 0.8))
                predicates = rule.score_contributions.get("evidence_predicates", [])

                matches.append(
                    RuleMatchResult(
                        rule=rule,
                        event=event,
                        threat_confidence=final_conf,
                        anomaly_score=anomaly_sc,
                        evidence_predicates=predicates,
                    )
                )
        return matches
