"""
AegisCore AI – Sentry Agent
Continuous monitoring, statistical feature extraction, and anomaly flagging.
Bounded: CANNOT execute responses or claim compromise from anomaly alone.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import structlog

from schemas.ocsf import OCSFEvent
from schemas.incident import AgentTrace
from services.detection.rules import RuleMatchResult

logger = structlog.get_logger()


class SentryAssessment:
    def __init__(
        self,
        hypothesis: str,
        trigger_fields: Dict[str, Any],
        anomaly_score: float,
        detector_version: str,
        trace: AgentTrace,
    ):
        self.hypothesis = hypothesis
        self.trigger_fields = trigger_fields
        self.anomaly_score = anomaly_score
        self.detector_version = detector_version
        self.trace = trace


class SentryAgent:
    """
    Sentry Agent:
    - Analyzes incoming telemetry and rule triggers
    - Extracts trigger fields and detector versions
    - Emits cautious initial hypothesis
    - Never declares confirmed compromise
    """

    DETECTOR_VERSION = "aegiscore-sentry-v1.2.0"

    def evaluate_trigger(
        self,
        event: OCSFEvent,
        rule_matches: List[RuleMatchResult],
        anomaly_score: float,
    ) -> SentryAssessment:
        now_iso = datetime.now(timezone.utc).isoformat()

        # Capture key trigger fields safely
        src_ip = event.network.src_ip if event.network else (event.actor.ip_addr if event.actor else "unknown")
        user = event.actor.user_name if event.actor else "unspecified_principal"
        activity = event.activity_name

        trigger_fields = {
            "source_product": event.source_product,
            "activity_name": activity,
            "principal": user,
            "source_ip": src_ip,
            "outcome": event.outcome,
            "matched_rules": [m.rule.id for m in rule_matches],
        }

        # Formulate cautious hypothesis
        if rule_matches:
            rule_names = ", ".join(m.rule.name for m in rule_matches)
            hypothesis = (
                f"Suspicious activity pattern observed: {rule_names}. "
                f"Statistical anomaly score is {anomaly_score:.2f}. "
                f"Requires corroboration across identity and endpoint telemetry before concluding compromise."
            )
            uncertainty = (
                "Initial trigger only. Potential causes include credential compromise, "
                "legitimate remote administrative work via VPN/proxy, or misconfigured tooling."
            )
        else:
            hypothesis = (
                f"Statistical deviation detected for {user} ({activity}) with anomaly score {anomaly_score:.2f}. "
                f"No specific attack signature matched."
            )
            uncertainty = "Elevated anomaly score may reflect benign workflow changes or initial anomalous behavior."

        trace = AgentTrace(
            agent="Sentry",
            timestamp=now_iso,
            observation=hypothesis,
            uncertainty_notes=uncertainty,
        )

        logger.info(
            "aegiscore.sentry.assessment_completed",
            event_id=event.event_id,
            anomaly_score=anomaly_score,
            rules_matched=len(rule_matches),
        )

        return SentryAssessment(
            hypothesis=hypothesis,
            trigger_fields=trigger_fields,
            anomaly_score=anomaly_score,
            detector_version=self.DETECTOR_VERSION,
            trace=trace,
        )
