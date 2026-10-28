"""
AegisCore AI – Incident Lifecycle State Machine
Enforces deterministic state transitions for security incidents.
Guarantees full audit trail and prevents illegal state bypasses.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional, Set
import structlog

from schemas.incident import IncidentRecord, IncidentStatus

logger = structlog.get_logger()


class InvalidStateTransitionError(Exception):
    pass


class IncidentStateMachine:
    """
    State Transition Graph:
      NEW ───────────────────► INVESTIGATING ───────────► CLOSED (False Positive)
                                     │
                                     ▼
                              PENDING_APPROVAL ─────────► CLOSED (Rejected by Approver)
                                     │
                                     ▼
                                 EXECUTING
                                     │
                                     ▼
                                 VERIFYING
                                ┌────┴────┐
                                ▼         ▼
                            CONTAINED  ESCALATED
                                └────┬────┘
                                     ▼
                                  CLOSED
    """

    ALLOWED_TRANSITIONS: Dict[IncidentStatus, Set[IncidentStatus]] = {
        IncidentStatus.NEW: {IncidentStatus.INVESTIGATING, IncidentStatus.CLOSED},
        IncidentStatus.INVESTIGATING: {
            IncidentStatus.PENDING_APPROVAL,
            IncidentStatus.CLOSED,
            IncidentStatus.ESCALATED,
        },
        IncidentStatus.PENDING_APPROVAL: {
            IncidentStatus.EXECUTING,
            IncidentStatus.CLOSED,
            IncidentStatus.ESCALATED,
        },
        IncidentStatus.EXECUTING: {
            IncidentStatus.VERIFYING,
            IncidentStatus.ESCALATED,
        },
        IncidentStatus.VERIFYING: {
            IncidentStatus.CONTAINED,
            IncidentStatus.ESCALATED,
        },
        IncidentStatus.CONTAINED: {IncidentStatus.CLOSED, IncidentStatus.ESCALATED},
        IncidentStatus.ESCALATED: {IncidentStatus.CLOSED, IncidentStatus.INVESTIGATING},
        IncidentStatus.CLOSED: set(),  # Terminal state
    }

    @classmethod
    def can_transition(cls, current_status: IncidentStatus, target_status: IncidentStatus) -> bool:
        return target_status in cls.ALLOWED_TRANSITIONS.get(current_status, set())

    @classmethod
    def transition(
        cls,
        incident: IncidentRecord,
        target_status: IncidentStatus,
        actor: str,
        reason: str = "",
    ) -> IncidentRecord:
        """
        Executes a validated state transition, updates timestamps, and logs the change.
        """
        if not cls.can_transition(incident.status, target_status):
            msg = (
                f"Illegal state transition from '{incident.status.value}' to '{target_status.value}' "
                f"for Incident ID '{incident.id}'. Allowed transitions: "
                f"{[s.value for s in cls.ALLOWED_TRANSITIONS.get(incident.status, set())]}"
            )
            logger.error("aegiscore.lifecycle.illegal_transition", incident_id=incident.id, from_state=incident.status.value, to_state=target_status.value)
            raise InvalidStateTransitionError(msg)

        old_status = incident.status
        incident.status = target_status
        incident.updated_at = datetime.now(timezone.utc).isoformat()

        logger.info(
            "aegiscore.lifecycle.transitioned",
            incident_id=incident.id,
            from_state=old_status.value,
            to_state=target_status.value,
            actor=actor,
            reason=reason,
        )
        return incident
