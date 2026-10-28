"""
AegisCore AI – Incidents Router
Exposes incident lifecycle management endpoints used by the SOC Dashboard.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import structlog

from database import get_db

logger = structlog.get_logger()
router = APIRouter()

# ── Mock data (matches dashboard mocks until DB is seeded) ────
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from mocks import MOCK_INCIDENTS, MOCK_METRICS


@router.get("/incidents", summary="List all incidents for tenant")
async def list_incidents(
    tenant_id: str = "tenant-aegis-production-us-east",
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    # Return mock data; will be replaced by DB query once fully seeded
    data = MOCK_INCIDENTS
    if status:
        data = [i for i in data if i.get("status") == status]
    return data


@router.get("/incidents/{incident_id}", summary="Get full incident dossier")
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
):
    match = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), None)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found.",
        )
    return match


@router.post(
    "/incidents/{incident_id}/approve",
    summary="Submit human approval for a candidate action",
)
async def approve_action(
    incident_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a cryptographically bound approval contract.
    Required fields: action_id, approver, role, justification
    """
    required = {"action_id", "approver", "role", "justification"}
    if not required.issubset(body.keys()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required fields: {required - body.keys()}",
        )

    # 1. Look up action tier from mock/incident
    match = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), None)
    target_action = None
    if match:
        target_action = next((a for a in match.get("candidate_actions", []) if a.get("action_id") == body["action_id"]), None)

    action_tier = target_action.get("tier", 2) if target_action else 2

    # 2. RBAC Role Validation
    from services.policy.engine import PolicyEngine
    from services.policy.approval_contract import ApprovalContractManager

    is_role_valid, role_msg = PolicyEngine.validate_approver_role(body["role"], action_tier)
    if not is_role_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=role_msg,
        )

    # 3. Create Cryptographically Bound Approval Contract
    target_id = target_action.get("target_entity_id", incident_id) if target_action else incident_id
    parameters = target_action.get("parameters", {}) if target_action else {}

    contract = ApprovalContractManager.create_contract(
        incident_id=incident_id,
        action_id=body["action_id"],
        target_id=target_id,
        parameters=parameters,
        approver_name=body["approver"],
        approver_role=body["role"],
        justification=body["justification"],
    )

    approval_record = contract.model_dump()

    # Update incident state
    if match:
        match["approval_contract"] = approval_record
        match["selected_action"] = target_action

    logger.info(
        "aegiscore.approval.created",
        incident=incident_id,
        action=body["action_id"],
        approver=body["approver"],
        contract_id=contract.contract_id,
    )
    return approval_record


@router.post(
    "/incidents/{incident_id}/transition",
    summary="Transition incident lifecycle state",
)
async def transition_incident(
    incident_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    target_status_str = body.get("target_status")
    actor = body.get("actor", "soc_analyst")
    reason = body.get("reason", "")

    if not target_status_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_status is required.",
        )

    # Validate against IncidentStateMachine
    try:
        from services.detection.lifecycle import IncidentStateMachine, InvalidStateTransitionError
        from schemas.incident import IncidentStatus
        
        target_status = IncidentStatus(target_status_str)
        # Check matching mock incident
        match = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), None)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident {incident_id} not found.",
            )
        
        current_status = IncidentStatus(match["status"])
        if not IncidentStateMachine.can_transition(current_status, target_status):
            allowed = [s.value for s in IncidentStateMachine.ALLOWED_TRANSITIONS.get(current_status, set())]
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot transition from {current_status.value} to {target_status.value}. Allowed: {allowed}",
            )
        
        match["status"] = target_status.value
        return {
            "incident_id": incident_id,
            "status": target_status.value,
            "actor": actor,
            "reason": reason,
            "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
        }
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except InvalidStateTransitionError as trans_err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(trans_err))


@router.post(
    "/incidents/{incident_id}/investigate",
    summary="Trigger Multi-Agent Investigation Loop (Sentry -> Investigator -> Validator)",
)
async def run_incident_investigation(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Executes the bounded multi-agent investigation workflow for the incident.
    Updates claims, evidence provenance, contradiction analysis, and agent traces.
    """
    match = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), None)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found.",
        )

    try:
        from services.investigation.workflow import InvestigationWorkflow
        from schemas.ocsf import OCSFEvent, OCSFActor, OCSFDevice, OCSFNetwork
        import datetime

        # Create synthetic anchor event representing the incident trigger
        anchor_event = OCSFEvent(
            tenant_id=match.get("tenant_id", "tenant-aegis-production-us-east"),
            source_product="Okta Identity",
            source_event_id="evt-okta-8841-002",
            event_class="Authentication",
            activity_name="TokenGeneration",
            outcome="Success",
            time_observed=datetime.datetime.now(datetime.timezone.utc),
            actor=OCSFActor(user_name="michael.chen@corp.internal", ip_addr="185.220.101.47"),
            device=OCSFDevice(hostname="WKSTN-0042"),
            network=OCSFNetwork(src_ip="185.220.101.47", direction="inbound"),
        )

        workflow = InvestigationWorkflow()
        result = workflow.run_investigation(
            event=anchor_event,
            rule_matches=[],
            anomaly_score=float(match["scores"]["anomaly_score"]),
        )

        # Update the live incident in registry/mock
        updated = result.incident.model_dump()
        match.update(updated)
        return match

    except Exception as exc:
        logger.error("aegiscore.investigation.failed", incident_id=incident_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Investigation workflow failed: {str(exc)}",
        )


@router.get("/metrics", summary="SOC telemetry metrics")
async def get_metrics():
    return MOCK_METRICS
