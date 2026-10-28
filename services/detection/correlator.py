"""
AegisCore AI – Sliding Window Event Correlator
Aggregates alerts and events across identity, endpoint, cloud, and network sources
within configurable temporal windows to form correlated Incident dossiers.
"""

from __future__ import annotations

import datetime
from typing import Dict, List, Optional, Tuple
import uuid
import structlog

from schemas.ocsf import OCSFEvent
from schemas.incident import (
    IncidentRecord,
    IncidentStatus,
    IncidentSeverity,
    IncidentScore,
    AffectedEntity,
    ClaimItem,
    ClaimSourceRef,
    EvidenceItem,
    CandidateAction,
)
from services.detection.rules import RuleMatchResult

logger = structlog.get_logger()


class CorrelatedIncidentWindow:
    def __init__(self, key: str, initial_event: OCSFEvent, window_minutes: int = 15):
        self.key = key
        self.window_seconds = window_minutes * 60
        self.first_seen = initial_event.time_observed
        self.last_seen = initial_event.time_observed
        self.events: List[OCSFEvent] = [initial_event]
        self.rule_matches: List[RuleMatchResult] = []
        self.incident_id = f"INC-{datetime.datetime.utcnow().year}-{str(uuid.uuid4())[:8].upper()}"

    def is_within_window(self, event: OCSFEvent) -> bool:
        t1 = self.last_seen.timestamp()
        t2 = event.time_observed.timestamp()
        return abs(t2 - t1) <= self.window_seconds

    def add_event(self, event: OCSFEvent, matches: List[RuleMatchResult]) -> None:
        self.events.append(event)
        self.rule_matches.extend(matches)
        if event.time_observed > self.last_seen:
            self.last_seen = event.time_observed


class IncidentCorrelator:
    def __init__(self, window_minutes: int = 15):
        self.window_minutes = window_minutes
        self.active_windows: Dict[str, CorrelatedIncidentWindow] = {}

    @staticmethod
    def get_correlation_key(event: OCSFEvent) -> str:
        """Derives primary correlation key: username, endpoint hostname, or source IP."""
        if event.actor and event.actor.user_name:
            return f"usr:{event.tenant_id}:{event.actor.user_name.lower()}"
        if event.device and event.device.hostname:
            return f"host:{event.tenant_id}:{event.device.hostname.lower()}"
        if event.network and event.network.src_ip:
            return f"ip:{event.tenant_id}:{event.network.src_ip}"
        return f"tenant:{event.tenant_id}:misc"

    def correlate(
        self, event: OCSFEvent, matches: List[RuleMatchResult], anomaly_score: float
    ) -> Optional[IncidentRecord]:
        """
        Correlates event with existing active incident window or creates a new one.
        Returns the updated IncidentRecord if an incident is generated/updated.
        """
        if not matches and anomaly_score < 0.65:
            return None

        key = self.get_correlation_key(event)
        window = self.active_windows.get(key)

        if window and window.is_within_window(event):
            window.add_event(event, matches)
            logger.info("aegiscore.correlator.event_correlated", key=key, incident_id=window.incident_id)
        else:
            window = CorrelatedIncidentWindow(key, event, self.window_minutes)
            window.rule_matches.extend(matches)
            self.active_windows[key] = window
            logger.info("aegiscore.correlator.window_opened", key=key, incident_id=window.incident_id)

        return self.build_incident_record(window, anomaly_score)

    def build_incident_record(
        self, window: CorrelatedIncidentWindow, latest_anomaly_score: float
    ) -> IncidentRecord:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Max confidence across matches
        highest_conf = 0.5
        highest_severity = IncidentSeverity.MEDIUM
        all_predicates: set[str] = set()
        matched_rule_names = []

        for m in window.rule_matches:
            if m.threat_confidence > highest_conf:
                highest_conf = m.threat_confidence
            if m.rule.severity == "CRITICAL":
                highest_severity = IncidentSeverity.CRITICAL
            elif m.rule.severity == "HIGH" and highest_severity != IncidentSeverity.CRITICAL:
                highest_severity = IncidentSeverity.HIGH
            all_predicates.update(m.evidence_predicates)
            matched_rule_names.append(m.rule.name)

        # Calculate 5D Scores
        # 1. Anomaly score: max of rule score and detector score
        anomaly_sc = max(latest_anomaly_score, 0.75 if window.rule_matches else 0.5)
        # 2. Threat confidence: grounded in telemetry match
        threat_conf = highest_conf
        # 3. Business impact: estimated based on targeted asset type
        business_imp = 0.5
        # 4. Action risk: initial risk
        action_risk = 0.35
        # 5. Evidence sufficiency: ratio of satisfied predicates
        evidence_suff = min(1.0, 0.4 + (0.2 * len(window.events)) + (0.1 * len(all_predicates)))

        scores = IncidentScore(
            anomaly_score=round(anomaly_sc, 2),
            threat_confidence=round(threat_conf, 2),
            business_impact=round(business_imp, 2),
            action_risk=round(action_risk, 2),
            evidence_sufficiency=round(evidence_suff, 2),
        )

        # Build affected entities
        affected: List[AffectedEntity] = []
        seen_entities = set()
        for e in window.events:
            if e.actor and e.actor.user_name and e.actor.user_name not in seen_entities:
                seen_entities.add(e.actor.user_name)
                is_svc = e.actor.user_name.startswith("svc-")
                affected.append(
                    AffectedEntity(
                        id=e.actor.user_uid or f"usr-{e.actor.user_name}",
                        name=e.actor.user_name,
                        type="service_account" if is_svc else "user",
                        criticality="Tier 1" if is_svc else "Tier 2",
                    )
                )
            if e.device and e.device.hostname and e.device.hostname not in seen_entities:
                seen_entities.add(e.device.hostname)
                affected.append(
                    AffectedEntity(
                        id=f"ep-{e.device.hostname.lower()}",
                        name=e.device.hostname,
                        type="endpoint",
                        criticality="Tier 2",
                    )
                )

        # Build claims with provenance
        claims: List[ClaimItem] = []
        evidence_items: List[EvidenceItem] = []

        for idx, e in enumerate(window.events):
            summary = f"{e.source_product} {e.activity_name} ({e.outcome})"
            claim_text = f"{e.activity_name} observed from {e.actor.user_name if e.actor else 'system'} via {e.source_product}."
            claims.append(
                ClaimItem(
                    id=f"clm-{idx+1:03d}",
                    text=claim_text,
                    is_inference=False,
                    source_ref=ClaimSourceRef(
                        event_id=e.event_id,
                        source_product=e.source_product,
                        time_observed=e.time_observed.isoformat(),
                        raw_event_ref=e.raw_event_ref,
                    ),
                )
            )
            evidence_items.append(
                EvidenceItem(
                    id=f"ev-{e.event_id[:8]}",
                    type="idp" if "Okta" in e.source_product else ("edr" if "CrowdStrike" in e.source_product else "cloud"),
                    source_product=e.source_product,
                    event_id=e.event_id,
                    observed_at=e.time_observed.isoformat(),
                    summary=summary,
                    raw_payload=f"{{\"event_id\":\"{e.event_id}\",\"activity\":\"{e.activity_name}\"}}",
                    is_untrusted=True,
                    fields={"activity": e.activity_name, "outcome": e.outcome},
                )
            )

        # One inference claim flagged explicitly
        claims.append(
            ClaimItem(
                id=f"clm-inf-{len(claims)+1:03d}",
                text=f"Correlated pattern indicates potential unauthorized activity matching: {', '.join(set(matched_rule_names)) or 'Statistical Anomaly'}.",
                is_inference=True,
            )
        )

        title = f"Multi-Source Telemetry Anomaly: {matched_rule_names[0] if matched_rule_names else 'Behavioral Deviation'}"

        return IncidentRecord(
            id=window.incident_id,
            tenant_id=window.events[0].tenant_id,
            title=title,
            status=IncidentStatus.INVESTIGATING,
            severity=highest_severity,
            created_at=window.first_seen.isoformat(),
            updated_at=now_iso,
            scores=scores,
            affected_entities=affected,
            claims=claims,
            evidence=evidence_items,
            candidate_actions=[],
        )
