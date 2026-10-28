"""
AegisCore AI – Remediation Execution & Connector Management Router
Dispatches scoped actions through idempotent connectors and monitors connector health.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
import structlog

from services.response.executor import RemediationExecutor
from services.policy.approval_contract import ApprovalContract
from schemas.incident import CandidateAction, IncidentRecord, IncidentStatus

logger = structlog.get_logger()
router = APIRouter()
_executor = RemediationExecutor()


@router.post(
    "/incidents/{incident_id}/execute",
    summary="Dispatch approved remediation action to scoped connector",
    description="Validates pre-execution contract integrity, checks kill switch, and executes through idempotent connector.",
)
async def execute_action(incident_id: str, body: dict):
    from apps.api.mocks import MOCK_INCIDENTS

    match = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), None)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found.",
        )

    action_id = body.get("action_id")
    target_action_dict = next((a for a in match.get("candidate_actions", []) if a.get("action_id") == action_id), None)
    if not target_action_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate action {action_id} not found in incident.",
        )

    # Reconstruct CandidateAction and IncidentRecord
    target_action = CandidateAction(**target_action_dict)
    incident = IncidentRecord(**match)

    approval_contract_dict = match.get("approval_contract")
    contract = ApprovalContract(**approval_contract_dict) if approval_contract_dict else None

    emergency_halt = body.get("emergency_halt_active", False)

    exec_result, updated_incident = _executor.dispatch_execution(
        incident=incident,
        action=target_action,
        approval_contract=contract,
        emergency_halt_active=emergency_halt,
    )

    if exec_result.status in ("FAILED", "HALTED"):
        raise HTTPException(
            status_code=exec_result.status_code,
            detail=exec_result.message,
        )

    # Update live mock registry
    match.update(updated_incident.model_dump())
    match["command_status"] = {
        "status_code": exec_result.status_code,
        "message": exec_result.message,
        "issued_at": exec_result.executed_at,
    }

    return {
        "incident_id": incident_id,
        "action_id": action_id,
        "execution_result": exec_result.to_dict(),
        "incident_status": updated_incident.status.value,
    }


@router.get(
    "/connectors/health",
    summary="Get status and latency of all scoped execution connectors",
)
async def get_connector_health():
    return [
        {"name": "Okta Identity Connector", "type": "idp", "status": "healthy", "latency_ms": 38, "error_rate_pct": 0.0},
        {"name": "CrowdStrike Falcon Connector", "type": "edr", "status": "healthy", "latency_ms": 64, "error_rate_pct": 0.0},
        {"name": "AWS Cloud Infrastructure Connector", "type": "cloud", "status": "healthy", "latency_ms": 95, "error_rate_pct": 0.0},
        {"name": "Palo Alto NGFW Orchestrator", "type": "network", "status": "healthy", "latency_ms": 48, "error_rate_pct": 0.0},
    ]
