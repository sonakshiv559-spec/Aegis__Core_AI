"""
AegisCore AI – Closed-Loop Postcondition Verifier Agent (Core USP 3)
Independent observer confirming security objectives and service health from fresh observations.
Executes rollback or human escalation branches on failed or partial verification.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import structlog

from schemas.incident import AgentTrace, CandidateAction, IncidentRecord, IncidentStatus
from services.verification.postconditions import PostconditionChecker, PostconditionCheckResult
from services.verification.health_checker import ServiceHealthChecker, ServiceHealthReport
from services.detection.lifecycle import IncidentStateMachine

logger = structlog.get_logger()


class ClosedLoopVerificationOutcome:
    def __init__(
        self,
        state: str,  # success | partial | failure | unknown
        incident: IncidentRecord,
        postcondition_result: PostconditionCheckResult,
        health_report: ServiceHealthReport,
        discrepancy_detected: bool,
        details: str,
        discrepancy_notes: Optional[str] = None,
    ):
        self.state = state
        self.incident = incident
        self.postcondition_result = postcondition_result
        self.health_report = health_report
        self.discrepancy_detected = discrepancy_detected
        self.details = details
        self.discrepancy_notes = discrepancy_notes
        self.verified_at = datetime.now(timezone.utc).isoformat()


class VerifierAgent:
    """
    Core USP 3 Verifier Agent:
    - Never trusts an API success receipt (HTTP 200) alone
    - Queries target systems and fresh telemetry for ground-truth postconditions
    - Audits upstream and dependent service health
    - Employs 4-state classification: success | partial | failure | unknown
    - Escalates on unknown or failed postconditions
    """

    def __init__(
        self,
        postcondition_checker: Optional[PostconditionChecker] = None,
        health_checker: Optional[ServiceHealthChecker] = None,
    ):
        self.postcondition_checker = postcondition_checker or PostconditionChecker()
        self.health_checker = health_checker or ServiceHealthChecker()

    def verify_remediation(
        self,
        incident: IncidentRecord,
        action: CandidateAction,
        command_status_code: int = 200,
        fault_injection: Optional[str] = None,
        dependent_services: Optional[List[str]] = None,
    ) -> ClosedLoopVerificationOutcome:
        now_iso = datetime.now(timezone.utc).isoformat()
        logger.info("aegiscore.verifier.started", incident_id=incident.id, action_id=action.action_id)

        # ── Step 1: Check Telemetry Timeout (Unknown State) ──────
        if fault_injection == "telemetry_timeout":
            state = "unknown"
            discrepancy_detected = True
            discrepancy_notes = (
                "TELEMETRY TIMEOUT: Target introspection endpoint timed out (> 60s). "
                "Unable to confirm whether security objective was achieved. "
                "Non-negotiable safety guardrail active: Further automation blocked; mandating human review."
            )
            details = "Telemetry query timed out. State is UNKNOWN."

            # Escalate incident
            incident = IncidentStateMachine.transition(
                incident, IncidentStatus.ESCALATED, actor="VerifierAgent", reason="Verification state UNKNOWN: Telemetry timeout"
            )

            trace = AgentTrace(
                agent="Verifier",
                timestamp=now_iso,
                observation=details,
                uncertainty_notes=discrepancy_notes,
            )
            incident.agent_traces.append(trace)

            post_res = PostconditionCheckResult(
                action_type=action.action_type,
                target_entity_id=action.target_entity_id,
                is_satisfied=False,
                observed_state={"error": "TIMEOUT"},
                discrepancy_detected=True,
                notes=discrepancy_notes,
            )
            health_rep = ServiceHealthReport(
                all_healthy=False,
                monitored_services=[],
                healthy_services=[],
                degraded_services=[],
                discrepancy_detected=True,
                notes="Health check bypassed due to timeout.",
            )

            return ClosedLoopVerificationOutcome(
                state=state,
                incident=incident,
                postcondition_result=post_res,
                health_report=health_rep,
                discrepancy_detected=discrepancy_detected,
                details=details,
                discrepancy_notes=discrepancy_notes,
            )

        # ── Step 2: Fresh Postcondition Telemetry Check ──────────
        post_result = self.postcondition_checker.verify_postconditions(
            action_type=action.action_type,
            target_entity_id=action.target_entity_id,
            command_status_code=command_status_code,
            fault_injection=fault_injection,
        )

        # ── Step 3: Dependent Service Health Verification ────────
        services_to_check = dependent_services or action.predicted_blast_radius
        health_result = self.health_checker.verify_service_health(
            dependent_services=services_to_check,
            simulate_collateral_failure=(fault_injection == "collateral_damage"),
        )

        # ── Step 4: 4-State Classification & Discrepancy Analysis ─
        discrepancy_detected = False
        discrepancy_notes = None

        if post_result.is_satisfied and health_result.all_healthy:
            state = "success"
            details = "Security postconditions satisfied; dependent services fully operational."
            # Transition to CONTAINED
            incident = IncidentStateMachine.transition(
                incident, IncidentStatus.CONTAINED, actor="VerifierAgent", reason="Verified containment confirmed by fresh observations"
            )

        elif not post_result.is_satisfied:
            state = "failure"
            discrepancy_detected = True
            discrepancy_notes = post_result.notes
            details = f"Postcondition verification FAILED for action '{action.name}'."
            # Escalate
            incident = IncidentStateMachine.transition(
                incident, IncidentStatus.ESCALATED, actor="VerifierAgent", reason="Verification postcondition FAILED"
            )

        else:
            # Postconditions passed but dependent services degraded -> PARTIAL
            state = "partial"
            discrepancy_detected = True
            discrepancy_notes = health_result.notes
            details = "Threat postcondition satisfied, but unexpected collateral service degradation observed."
            incident = IncidentStateMachine.transition(
                incident, IncidentStatus.ESCALATED, actor="VerifierAgent", reason="Collateral service health degradation observed"
            )

        # ── Step 5: Append Verifier Trace ────────────────────────
        trace = AgentTrace(
            agent="Verifier",
            timestamp=now_iso,
            observation=f"Closed-loop verification outcome: {state.upper()}. {details}",
            uncertainty_notes=discrepancy_notes if discrepancy_detected else "Zero residual anomalies detected.",
        )
        incident.agent_traces.append(trace)

        logger.info(
            "aegiscore.verifier.outcome",
            incident_id=incident.id,
            state=state,
            discrepancy=discrepancy_detected,
        )

        return ClosedLoopVerificationOutcome(
            state=state,
            incident=incident,
            postcondition_result=post_result,
            health_report=health_result,
            discrepancy_detected=discrepancy_detected,
            details=details,
            discrepancy_notes=discrepancy_notes,
        )
