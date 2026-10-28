"""
AegisCore AI – Closed-Loop Verification Router (USP 3)
Exposes postcondition verification, silent failure detection, and service health endpoints.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
import structlog

from services.verification.verifier import VerifierAgent
from schemas.incident import CandidateAction, IncidentRecord

logger = structlog.get_logger()
router = APIRouter()
_verifier = VerifierAgent()


@router.post(
    "/incidents/{incident_id}/verify",
    summary="Execute closed-loop postcondition and service health verification",
    description="Queries fresh observations directly. Supports fault injection testing (silent_api_failure, collateral_damage, telemetry_timeout).",
)
async def verify_incident_remediation(incident_id: str, body: Optional[dict] = None):
    from apps.api.mocks import MOCK_INCIDENTS

    match = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), None)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found.",
        )

    body = body or {}
    fault_injection = body.get("fault_injection")  # silent_api_failure | collateral_damage | telemetry_timeout

    # Get selected or first candidate action
    selected_action_dict = match.get("selected_action") or (match.get("candidate_actions", [])[0] if match.get("candidate_actions") else None)
    if not selected_action_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incident has no selected candidate action to verify.",
        )

    action = CandidateAction(**selected_action_dict)
    incident = IncidentRecord(**match)

    outcome = _verifier.verify_remediation(
        incident=incident,
        action=action,
        command_status_code=match.get("command_status", {}).get("status_code", 200),
        fault_injection=fault_injection,
    )

    verified_state_payload = {
        "state": outcome.state,
        "verified_at": outcome.verified_at,
        "details": outcome.details,
        "discrepancy_detected": outcome.discrepancy_detected,
        "discrepancy_notes": outcome.discrepancy_notes,
    }

    # Update live mock registry
    match.update(outcome.incident.model_dump())
    match["verified_state"] = verified_state_payload

    return {
        "incident_id": incident_id,
        "verification_outcome": outcome.state,
        "discrepancy_detected": outcome.discrepancy_detected,
        "verified_state": verified_state_payload,
        "incident_status": outcome.incident.status.value,
    }
