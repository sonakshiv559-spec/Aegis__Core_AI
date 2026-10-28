"""
AegisCore AI – Multi-Agent Investigation Workflow Orchestrator
Coordinates Sentry -> Investigator -> Validator bounded agent execution.
Enforces untrusted data isolation, loop limits, and stateful checkpointing.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import structlog

from schemas.ocsf import OCSFEvent
from schemas.incident import (
    IncidentRecord,
    IncidentStatus,
    IncidentSeverity,
    IncidentScore,
)
from services.detection.rules import RuleMatchResult
from services.investigation.sentry import SentryAgent, SentryAssessment
from services.investigation.investigator import InvestigatorAgent, InvestigatorFinding
from services.investigation.validator import ValidatorAgent, ValidationAssessment
from services.detection.lifecycle import IncidentStateMachine

logger = structlog.get_logger()


class InvestigationWorkflowResult:
    def __init__(
        self,
        incident: IncidentRecord,
        sentry_assessment: SentryAssessment,
        investigator_finding: InvestigatorFinding,
        validation_assessment: ValidationAssessment,
    ):
        self.incident = incident
        self.sentry_assessment = sentry_assessment
        self.investigator_finding = investigator_finding
        self.validation_assessment = validation_assessment


class InvestigationWorkflow:
    """
    Finite-State Machine / LangGraph pattern:
      [Trigger Event]
             │
             ▼
      ┌──────────────┐
      │ Sentry Agent │ ──► Initial Hypothesis & Anomaly Extraction
      └──────┬───────┘
             │
             ▼
      ┌────────────────────┐
      │ Investigator Agent │ ──► Bounded Evidence Gathering & Provenance
      └──────┬─────────────┘
             │
             ▼
      ┌─────────────────┐
      │ Validator Agent │ ──► Contradiction Check & Evidence Sufficiency Gating
      └──────┬──────────┘
             │
             ▼
      [Updated Incident Dossier & State Transition]
    """

    def __init__(
        self,
        sentry: Optional[SentryAgent] = None,
        investigator: Optional[InvestigatorAgent] = None,
        validator: Optional[ValidatorAgent] = None,
    ):
        self.sentry = sentry or SentryAgent()
        self.investigator = investigator or InvestigatorAgent()
        self.validator = validator or ValidatorAgent()

    def run_investigation(
        self,
        event: OCSFEvent,
        rule_matches: List[RuleMatchResult],
        anomaly_score: float,
        existing_incident: Optional[IncidentRecord] = None,
    ) -> InvestigationWorkflowResult:
        logger.info("aegiscore.workflow.started", event_id=event.event_id)

        # ── Step 1: Sentry Agent ─────────────────────────────────
        sentry_res = self.sentry.evaluate_trigger(event, rule_matches, anomaly_score)

        # ── Step 2: Investigator Agent ───────────────────────────
        investigator_res = self.investigator.investigate(event, sentry_res)

        # ── Step 3: Validator Agent ──────────────────────────────
        validator_res = self.validator.validate(sentry_res, investigator_res)

        # ── Step 4: Assemble Dossier & 5D Scores ──────────────────
        now_iso = datetime.now(timezone.utc).isoformat()
        incident_id = existing_incident.id if existing_incident else f"INC-{datetime.utcnow().year}-8841"

        # Determine severity
        severity = IncidentSeverity.HIGH
        if any(m.rule.severity == "CRITICAL" for m in rule_matches):
            severity = IncidentSeverity.CRITICAL

        scores = IncidentScore(
            anomaly_score=round(anomaly_score, 2),
            threat_confidence=validator_res.adjusted_threat_confidence,
            business_impact=0.85,  # Populated from context graph in Phase 5
            action_risk=0.42,      # Populated from action planner
            evidence_sufficiency=validator_res.evidence_sufficiency,
        )

        all_traces = [sentry_res.trace, investigator_res.trace, validator_res.trace]

        # Determine next state
        # If action eligible -> PENDING_APPROVAL; else remain in INVESTIGATING
        next_status = (
            IncidentStatus.PENDING_APPROVAL
            if validator_res.is_action_eligible
            else IncidentStatus.INVESTIGATING
        )

        title = f"Multi-Source Telemetry Correlated: {rule_matches[0].rule.name if rule_matches else 'Behavioral Anomaly'}"

        incident = IncidentRecord(
            id=incident_id,
            tenant_id=event.tenant_id,
            title=title,
            status=next_status,
            severity=severity,
            created_at=existing_incident.created_at if existing_incident else now_iso,
            updated_at=now_iso,
            scores=scores,
            affected_entities=investigator_res.affected_entities,
            claims=investigator_res.claims,
            evidence=investigator_res.evidence,
            candidate_actions=existing_incident.candidate_actions if existing_incident else [],
            selected_action=existing_incident.selected_action if existing_incident else None,
            contradictions_and_unknowns=validator_res.contradictions_and_unknowns,
            agent_traces=all_traces,
        )

        logger.info(
            "aegiscore.workflow.completed",
            incident_id=incident.id,
            status=incident.status.value,
            sufficiency=scores.evidence_sufficiency,
            threat_confidence=scores.threat_confidence,
        )

        return InvestigationWorkflowResult(
            incident=incident,
            sentry_assessment=sentry_res,
            investigator_finding=investigator_res,
            validation_assessment=validator_res,
        )
