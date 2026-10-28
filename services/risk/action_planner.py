"""
AegisCore AI – Candidate Action Planner & Multi-Factor Ranking Engine (USP 1)
Generates bounded candidate remediation options and ranks them using dependency-aware
blast radius, security containment efficacy, and action reversibility.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import structlog

from schemas.incident import CandidateAction, IncidentRecord
from services.risk.blast_radius import BlastRadiusCalculator, BlastRadiusReport

logger = structlog.get_logger()


class ActionPlanner:
    """
    Candidate Action Ranking Optimization:
      Score = alpha * (Security Gain) - beta * (Business Disruption Cost) + gamma * (Reversibility)
    Prefers targeted, high-reversibility containment over disruptive isolation whenever safe.
    """

    ALPHA = 0.50  # Weight for Security Containment Gain
    BETA = 0.35   # Penalty weight for Business Disruption Cost
    GAMMA = 0.15  # Weight for Action Reversibility

    def __init__(self, blast_calculator: Optional[BlastRadiusCalculator] = None):
        self.blast_calc = blast_calculator or BlastRadiusCalculator()

    def generate_candidate_actions(
        self, incident: IncidentRecord
    ) -> Tuple[List[CandidateAction], CandidateAction]:
        candidates: List[CandidateAction] = []

        # Find targets
        user_entity = next((e for e in incident.affected_entities if e.type in ("user", "service_account")), None)
        endpoint_entity = next((e for e in incident.affected_entities if e.type == "endpoint"), None)

        # ── Option 1: Targeted Identity Session Revocation ─────────────────
        if user_entity:
            user_blast = self.blast_calc.calculate_blast_radius(user_entity.id, "RevokeUserSession")
            act_user = CandidateAction(
                action_id="act-001",
                action_type="RevokeUserSession",
                name=f"Revoke All Active Sessions for {user_entity.name}",
                tier=2 if user_entity.criticality == "Tier 1" else 1,
                target_entity_id=user_entity.id,
                target_entity_name=user_entity.name,
                target_entity_type=user_entity.type,
                predicted_blast_radius=user_blast.disrupted_services,
                reversibility_score=0.95,
                required_evidence_predicates=["active_session_confirmed", "external_ip_flagged"],
                security_gain=0.85,
                business_disruption_cost=user_blast.business_disruption_cost,
                parameters={"user_id": user_entity.id, "scope": "all_sessions"},
                policy_version="v1.0.0",
            )
            candidates.append(act_user)

        # ── Option 2: Endpoint Isolation ───────────────────────────────────
        if endpoint_entity:
            ep_blast = self.blast_calc.calculate_blast_radius(endpoint_entity.id, "IsolateEndpoint")
            act_ep = CandidateAction(
                action_id="act-002",
                action_type="IsolateEndpoint",
                name=f"Network-Isolate Endpoint {endpoint_entity.name}",
                tier=2,
                target_entity_id=endpoint_entity.id,
                target_entity_name=endpoint_entity.name,
                target_entity_type="endpoint",
                predicted_blast_radius=ep_blast.disrupted_services,
                reversibility_score=0.70,
                required_evidence_predicates=["credential_dump_confirmed", "endpoint_telemetry_present"],
                security_gain=0.92,
                business_disruption_cost=ep_blast.business_disruption_cost,
                parameters={"device_id": endpoint_entity.id},
                policy_version="v1.0.0",
            )
            candidates.append(act_ep)

        # ── Option 3: Targeted Cloud Security Group Tightening ─────────────
        cloud_target = next((e for e in incident.affected_entities if "sg-" in e.id or "security_group" in e.type), None)
        if cloud_target:
            sg_blast = self.blast_calc.calculate_blast_radius(cloud_target.id, "UpdateSecurityGroup")
            act_sg = CandidateAction(
                action_id="act-003",
                action_type="UpdateSecurityGroup",
                name=f"Revoke Public 0.0.0.0/0 Ingress on {cloud_target.name}",
                tier=2,
                target_entity_id=cloud_target.id,
                target_entity_name=cloud_target.name,
                target_entity_type="cloud_resource",
                predicted_blast_radius=sg_blast.disrupted_services,
                reversibility_score=0.90,
                required_evidence_predicates=["security_group_change_logged", "public_cidr_confirmed"],
                security_gain=0.90,
                business_disruption_cost=sg_blast.business_disruption_cost,
                parameters={"group_id": cloud_target.id, "cidr": "0.0.0.0/0"},
                policy_version="v1.0.0",
            )
            candidates.append(act_sg)

        # Rank candidates by objective function score
        def compute_score(action: CandidateAction) -> float:
            score = (
                self.ALPHA * action.security_gain
                - self.BETA * action.business_disruption_cost
                + self.GAMMA * action.reversibility_score
            )
            return round(score, 4)

        ranked = sorted(candidates, key=compute_score, reverse=True)
        selected_action = ranked[0] if ranked else None

        logger.info(
            "aegiscore.action_planner.ranked",
            candidate_count=len(ranked),
            selected=selected_action.action_id if selected_action else "None",
            scores=[(a.action_id, compute_score(a)) for a in ranked],
        )

        return ranked, selected_action
