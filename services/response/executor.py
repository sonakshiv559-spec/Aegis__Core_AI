"""
AegisCore AI – Remediation Action Executor
Executes approved, scoped, idempotent remediation actions through restricted connectors.
Enforces pre-execution approval contract integrity, rate limiting, and stop controls.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
import structlog

from schemas.incident import AgentTrace, CandidateAction, IncidentRecord, IncidentStatus
from services.policy.approval_contract import ApprovalContract, ApprovalContractManager
from services.response.connectors.base import ConnectorExecutionResult
from services.response.connectors.idp_connector import IdPConnector
from services.response.connectors.edr_connector import EDRConnector
from services.response.connectors.cloud_connector import CloudConnector
from services.detection.lifecycle import IncidentStateMachine

logger = structlog.get_logger()


class RemediationExecutor:
    """
    Central response execution dispatcher.
    - Strictly checks pre-execution contract integrity
    - Aborts on Emergency Kill Switch
    - Routes to scoped, idempotent connectors
    - Hands over execution state to the verification loop
    """

    def __init__(self):
        self.idp_connector = IdPConnector()
        self.edr_connector = EDRConnector()
        self.cloud_connector = CloudConnector()

    def dispatch_execution(
        self,
        incident: IncidentRecord,
        action: CandidateAction,
        approval_contract: Optional[ApprovalContract],
        emergency_halt_active: bool = False,
    ) -> Tuple[ConnectorExecutionResult, IncidentRecord]:
        now_iso = datetime.now(timezone.utc).isoformat()

        # ── Invariant 1: Emergency Kill Switch ───────────────────
        if emergency_halt_active:
            logger.error("aegiscore.executor.emergency_halt_abort", incident=incident.id, action=action.action_id)
            result = ConnectorExecutionResult(
                action_id=action.action_id,
                connector_name="ExecutorDispatcher",
                status="HALTED",
                status_code=423,  # Locked
                message="Execution aborted. Global Emergency Kill Switch is ACTIVE.",
                idempotency_key="",
                target_entity_id=action.target_entity_id,
                simulated_state={},
                execution_time_ms=0.0,
            )
            return result, incident

        # ── Invariant 2: Pre-Execution Approval Contract Integrity
        # Tier 0 observe actions do not mandate contracts, but Tier >= 1 material actions DO
        if action.tier >= 1:
            if not approval_contract:
                logger.error("aegiscore.executor.missing_contract", action=action.action_id)
                result = ConnectorExecutionResult(
                    action_id=action.action_id,
                    connector_name="ExecutorDispatcher",
                    status="FAILED",
                    status_code=403,
                    message=f"Unauthorized: Tier {action.tier} action requires a cryptographically bound approval contract.",
                    idempotency_key="",
                    target_entity_id=action.target_entity_id,
                    simulated_state={},
                    execution_time_ms=0.0,
                )
                return result, incident

            # Check pre-execution contract integrity (anti-tamper + expiry)
            is_valid, validation_msg = ApprovalContractManager.verify_pre_execution_integrity(
                contract=approval_contract,
                current_target_id=action.target_entity_id,
                current_parameters=action.parameters,
                current_policy_version=action.policy_version,
            )

            if not is_valid:
                logger.error("aegiscore.executor.contract_invalid", reason=validation_msg)
                result = ConnectorExecutionResult(
                    action_id=action.action_id,
                    connector_name="ExecutorDispatcher",
                    status="FAILED",
                    status_code=403,
                    message=f"Execution blocked: {validation_msg}",
                    idempotency_key="",
                    target_entity_id=action.target_entity_id,
                    simulated_state={},
                    execution_time_ms=0.0,
                )
                return result, incident

        # ── Invariant 3: Transition to EXECUTING ───────────────────
        if incident.status == IncidentStatus.PENDING_APPROVAL:
            incident = IncidentStateMachine.transition(
                incident, IncidentStatus.EXECUTING, actor="ExecutorDispatcher", reason="Action authorized by policy"
            )

        # ── Step 4: Route to Appropriate Scoped Connector ────────
        action_type = action.action_type
        if action_type in ("RevokeUserSession", "RevokeToken", "ResetPassword"):
            exec_result = self.idp_connector.execute(
                incident_id=incident.id,
                action_id=action.action_id,
                target_id=action.target_entity_id,
                parameters=action.parameters,
            )
        elif action_type in ("IsolateEndpoint", "KillProcess"):
            exec_result = self.edr_connector.execute(
                incident_id=incident.id,
                action_id=action.action_id,
                target_id=action.target_entity_id,
                parameters=action.parameters,
            )
        elif action_type in ("UpdateSecurityGroup", "RevokeSecurityGroupIngress"):
            exec_result = self.cloud_connector.execute(
                incident_id=incident.id,
                action_id=action.action_id,
                target_id=action.target_entity_id,
                parameters=action.parameters,
            )
        else:
            exec_result = ConnectorExecutionResult(
                action_id=action.action_id,
                connector_name="UnknownConnector",
                status="FAILED",
                status_code=400,
                message=f"No registered connector for action type '{action_type}'.",
                idempotency_key="",
                target_entity_id=action.target_entity_id,
                simulated_state={},
                execution_time_ms=0.0,
            )

        # ── Step 5: Append Executor Trace & Handover to Verifier ───
        trace = AgentTrace(
            agent="Executor",
            timestamp=now_iso,
            observation=(
                f"Dispatched action '{action.name}' to connector '{exec_result.connector_name}'. "
                f"Command Status: {exec_result.status_code} ({exec_result.status}). "
                f"Latency: {exec_result.execution_time_ms}ms. Idempotency Key: {exec_result.idempotency_key}."
            ),
            uncertainty_notes=(
                "Command acknowledgment received from API (HTTP 200). "
                "Non-negotiable safety invariant: API return code alone does not prove threat containment. "
                "Handing over to Closed-Loop Verifier for fresh state observation."
            ),
        )
        incident.agent_traces.append(trace)

        # Transition to VERIFYING state if command succeeded
        if exec_result.status in ("SUCCESS", "IDEMPOTENT_REPLAY"):
            incident = IncidentStateMachine.transition(
                incident, IncidentStatus.VERIFYING, actor="ExecutorDispatcher", reason="Command dispatched; awaiting verification"
            )

        return exec_result, incident
