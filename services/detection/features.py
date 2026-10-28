"""
AegisCore AI – Telemetry Feature Extractor
Transforms raw OCSFEvents into standardized numerical and categorical feature vectors
for statistical anomaly detection and feature baselines.
"""

from __future__ import annotations

import ipaddress
import re
from typing import Any, Dict, List, Optional
from schemas.ocsf import OCSFEvent


SENSITIVE_PORTS = {22, 3389, 5432, 3306, 1433, 1521, 27017, 6379, 9200, 2375}
AUTOMATION_UA_REGEX = re.compile(r"(curl|python|wget|httpie|go-http|postman|bot|scanner)", re.IGNORECASE)
PRIVILEGED_NAMES_REGEX = re.compile(r"(admin|root|svc-|system|operator|daemon)", re.IGNORECASE)


def is_private_ip(ip_str: Optional[str]) -> bool:
    if not ip_str:
        return False
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback
    except ValueError:
        return False


class EventFeatureExtractor:
    """Extracts a standard feature vector from an OCSFEvent."""

    FEATURE_NAMES = [
        "is_external_ip",
        "is_failure_outcome",
        "is_automation_agent",
        "is_privileged_identity",
        "targets_sensitive_port",
        "has_high_severity_technique",
        "has_process_command_line",
        "hour_of_day_utc",
    ]

    @classmethod
    def extract_features(cls, event: OCSFEvent) -> List[float]:
        """Returns a fixed-dimension float array for ML models."""
        src_ip = event.network.src_ip if event.network else (event.actor.ip_addr if event.actor else None)
        is_ext = 0.0 if is_private_ip(src_ip) else (1.0 if src_ip else 0.5)

        is_fail = 1.0 if event.outcome == "Failure" else 0.0

        ua = (event.actor.user_agent if event.actor else "") or ""
        is_auto = 1.0 if AUTOMATION_UA_REGEX.search(ua) else 0.0

        actor_name = (event.actor.user_name if event.actor else "") or ""
        is_priv = 1.0 if PRIVILEGED_NAMES_REGEX.search(actor_name) else 0.0

        dst_port = event.network.dst_port if event.network else (event.target.port if event.target else None)
        sensitive_port = 1.0 if (dst_port and dst_port in SENSITIVE_PORTS) else 0.0

        actor_extras = (event.actor.extras if event.actor else {}) or {}
        has_tech = 1.0 if bool(actor_extras.get("technique") or actor_extras.get("tactic")) else 0.0
        has_cmd = 1.0 if bool(actor_extras.get("command_line")) else 0.0

        hour = float(event.time_observed.hour) / 24.0

        return [
            is_ext,
            is_fail,
            is_auto,
            is_priv,
            sensitive_port,
            has_tech,
            has_cmd,
            hour,
        ]

    @classmethod
    def extract_dict(cls, event: OCSFEvent) -> Dict[str, Any]:
        """Returns named dictionary of features."""
        vec = cls.extract_features(event)
        return dict(zip(cls.FEATURE_NAMES, vec))
