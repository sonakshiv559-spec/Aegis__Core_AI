"""
AegisCore AI – Unified Fast Detection Engine
Coordinates RuleEngine, AnomalyDetector, and IncidentCorrelator.
Called by the ingestion pipeline and live API to detect threats and manage incident lifecycles.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
import structlog

from schemas.ocsf import OCSFEvent
from schemas.incident import IncidentRecord, IncidentStatus
from services.detection.rules import RuleEngine, RuleMatchResult
from services.detection.anomaly import AnomalyDetector
from services.detection.correlator import IncidentCorrelator
from services.detection.lifecycle import IncidentStateMachine

logger = structlog.get_logger()


class DetectionEngine:
    def __init__(
        self,
        rules_dir: Optional[str] = None,
        correlation_window_minutes: int = 15,
    ):
        self.rule_engine = RuleEngine(rules_dir=rules_dir)
        self.anomaly_detector = AnomalyDetector()
        self.correlator = IncidentCorrelator(window_minutes=correlation_window_minutes)
        self.incident_registry: Dict[str, IncidentRecord] = {}

    def process_event(
        self, event: OCSFEvent
    ) -> Tuple[List[RuleMatchResult], float, Optional[IncidentRecord]]:
        """
        Fast-path evaluation for an ingested OCSF event:
        1. Evaluates deterministic rules.
        2. Computes statistical anomaly score.
        3. Correlates event into sliding time windows.
        4. Updates or creates an IncidentRecord.
        """
        # 1. Rules
        rule_matches = self.rule_engine.evaluate(event)

        # 2. Anomaly
        anomaly_score = self.anomaly_detector.predict_anomaly_score(event)

        # 3. Correlate
        incident = self.correlator.correlate(event, rule_matches, anomaly_score)

        if incident:
            self.incident_registry[incident.id] = incident
            logger.info(
                "aegiscore.detection.incident_updated",
                incident_id=incident.id,
                severity=incident.severity.value,
                matches=len(rule_matches),
                anomaly_score=anomaly_score,
            )

        return rule_matches, anomaly_score, incident

    def get_incident(self, incident_id: str) -> Optional[IncidentRecord]:
        return self.incident_registry.get(incident_id)

    def list_incidents(
        self, tenant_id: str, status: Optional[str] = None
    ) -> List[IncidentRecord]:
        res = [
            i for i in self.incident_registry.values()
            if i.tenant_id == tenant_id
        ]
        if status:
            res = [i for i in res if i.status.value == status]
        return res

    def advance_incident_status(
        self, incident_id: str, target_status: IncidentStatus, actor: str, reason: str = ""
    ) -> IncidentRecord:
        incident = self.incident_registry.get(incident_id)
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")
        updated = IncidentStateMachine.transition(incident, target_status, actor=actor, reason=reason)
        self.incident_registry[incident_id] = updated
        return updated
