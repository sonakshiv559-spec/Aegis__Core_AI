"""
AegisCore AI – Deterministic Policy & Authorization Engine (USP 2)
Evidence-Gated, Risk-Adaptive Autonomy.
Completely isolated from generative model weights.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import structlog

from schemas.incident import CandidateAction, IncidentRecord
from services.policy.rules import (
    ACTION_EVIDENCE_PREDICATES,
    ACTION_TIER_DEFINITIONS,
    POLICY_VERSION,
    ROLE_PERMITTED_TIERS,
)

logger = structlog.get_logger()


class PolicyDecisionType(str, Enum):
    PERMITTED_AUTOMATIC = "PERMITTED_AUTOMATIC"
    REQUIRES_HUMAN_APPROVAL = "REQUIRES_HUMAN_APPROVAL"
    DENIED_INSUFFICIENT_EVIDENCE = "DENIED_INSUFFICIENT_EVIDENCE"
    DENIED_POLICY_VIOLATION = "DENIED_POLICY_VIOLATION"
    HALTED_EMERGENCY_KILL_SWITCH = "HALTED_EMERGENCY_KILL_SWITCH"


class PolicyEvaluationResult:
    def __init__(
        self,
        decision: PolicyDecisionType,
        is_permitted: bool,
        requires_approval: bool,
        required_role: Optional[str],
        satisfied_predicates: List[str],
        missing_predicates: List[str],
        reason: str,
        policy_version: str = POLICY_VERSION,
    ):
        self.decision = decision
        self.is_permitted = is_permitted
        self.requires_approval = requires_approval
        self.required_role = required_role
        self.satisfied_predicates = satisfied_predicates
        self.missing_predicates = missing_predicates
        self.reason = reason
        self.policy_version = policy_version


class PolicyEngine:
    """
    Core Deterministic Gatekeeper:
    High model confidence does NOT grant execution rights.
    Autonomy is governed by independent deterministic predicates across 5 dimensions.
    """

    def __init__(self, policy_version: str = POLICY_VERSION):
        self.policy_version = policy_version

    def evaluate_action_authorization(
        self,
        incident: IncidentRecord,
        action: CandidateAction,
        operating_mode: str = "approval",
        emergency_halt_active: bool = False,
    ) -> PolicyEvaluationResult:
        # ── Gate 1: Global Emergency Kill Switch ─────────────────
        if emergency_halt_active:
            logger.warn("aegiscore.policy.emergency_halt_blocked", action=action.action_id)
            return PolicyEvaluationResult(
                decision=PolicyDecisionType.HALTED_EMERGENCY_KILL_SWITCH,
                is_permitted=False,
                requires_approval=False,
                required_role=None,
                satisfied_predicates=[],
                missing_predicates=[],
                reason="Global Emergency Kill Switch is ACTIVE. All automation and connector dispatch frozen.",
            )

        # ── Gate 2: Action-Specific Evidence Predicates (USP 2) ──
        required_predicates = ACTION_EVIDENCE_PREDICATES.get(action.action_type, action.required_evidence_predicates)
        
        # Derive available predicates from verified claims and evidence
        available_predicates: Set[str] = set()
        for ev in incident.evidence:
            if ev.source_product == "Okta Identity" and ev.fields.get("outcome") == "Success":
                available_predicates.add("active_session_confirmed")
            if ev.fields.get("ip") and not ev.fields.get("ip", "").startswith("10."):
                available_predicates.add("external_ip_flagged")
            if "CrowdStrike" in ev.source_product:
                available_predicates.add("endpoint_telemetry_present")
                if "Credential" in str(ev.fields.get("technique", "")) or "lsass" in str(ev.raw_payload):
                    available_predicates.add("credential_dump_confirmed")
            if "CloudTrail" in ev.source_product:
                available_predicates.add("security_group_change_logged")
                available_predicates.add("service_account_login_external")
                available_predicates.add("no_mfa_for_service_account")
                if "0.0.0.0/0" in str(ev.raw_payload):
                    available_predicates.add("public_cidr_confirmed")

        satisfied = [p for p in required_predicates if p in available_predicates]
        missing = [p for p in required_predicates if p not in available_predicates]

        if missing:
            logger.warn("aegiscore.policy.missing_predicates", action=action.action_id, missing=missing)
            return PolicyEvaluationResult(
                decision=PolicyDecisionType.DENIED_INSUFFICIENT_EVIDENCE,
                is_permitted=False,
                requires_approval=True,
                required_role="Lead SOC Tier-3 Responder",
                satisfied_predicates=satisfied,
                missing_predicates=missing,
                reason=(
                    f"Evidence sufficiency gate failed. Missing mandatory predicates: {missing}. "
                    f"High model confidence cannot bypass evidence requirements."
                ),
            )

        # ── Gate 3: Action Tier & Role Definition ────────────────
        tier_info = ACTION_TIER_DEFINITIONS.get(action.tier, ACTION_TIER_DEFINITIONS[2])
        required_role = tier_info.get("required_role")

        # ── Gate 4: 5-Dimensional Safety Invariant ───────────────
        scores = incident.scores
        mandates_approval = scores.requires_human_approval()

        # ── Gate 5: Operating Mode Evaluation ────────────────────
        # In 'approval' mode (default), all actions of Tier >= 1 require human authorization
        if operating_mode == "approval":
            if action.tier == 0:
                return PolicyEvaluationResult(
                    decision=PolicyDecisionType.PERMITTED_AUTOMATIC,
                    is_permitted=True,
                    requires_approval=False,
                    required_role=None,
                    satisfied_predicates=satisfied,
                    missing_predicates=[],
                    reason="Tier 0 observe action permitted automatically under read-only scope.",
                )
            return PolicyEvaluationResult(
                decision=PolicyDecisionType.REQUIRES_HUMAN_APPROVAL,
                is_permitted=False,
                requires_approval=True,
                required_role=required_role,
                satisfied_predicates=satisfied,
                missing_predicates=[],
                reason=f"Approval Mode active. Tier {action.tier} action requires authenticated sign-off by {required_role}.",
            )

        # In 'automatic' mode (opt-in):
        # Strictly restricted to Tier 0 and Tier 1 (within limits). Tier 2 and Tier 3 always require approval.
        if action.tier in (0, 1):
            if mandates_approval and action.tier == 1:
                return PolicyEvaluationResult(
                    decision=PolicyDecisionType.REQUIRES_HUMAN_APPROVAL,
                    is_permitted=False,
                    requires_approval=True,
                    required_role=required_role,
                    satisfied_predicates=satisfied,
                    missing_predicates=[],
                    reason="Incident risk/impact score exceeded automatic execution threshold.",
                )
            return PolicyEvaluationResult(
                decision=PolicyDecisionType.PERMITTED_AUTOMATIC,
                is_permitted=True,
                requires_approval=False,
                required_role=None,
                satisfied_predicates=satisfied,
                missing_predicates=[],
                reason="Preauthorized Tier 1 action permitted automatically in opt-in mode.",
            )

        # Production-grade changes (Tier 2 & 3) NEVER execute automatically
        return PolicyEvaluationResult(
            decision=PolicyDecisionType.REQUIRES_HUMAN_APPROVAL,
            is_permitted=False,
            requires_approval=True,
            required_role=required_role,
            satisfied_predicates=satisfied,
            missing_predicates=[],
            reason=f"Tier {action.tier} material modifications mandate human sign-off even in Automatic Mode.",
        )

    @classmethod
    def validate_approver_role(cls, approver_role: str, action_tier: int) -> Tuple[bool, str]:
        """Validates RBAC sign-off rights for an action tier."""
        permitted_tiers = ROLE_PERMITTED_TIERS.get(approver_role, set())
        if action_tier in permitted_tiers:
            return True, f"Role '{approver_role}' is authorized for Tier {action_tier} actions."
        return False, (
            f"Unauthorized approver role. Role '{approver_role}' is permitted for tiers {sorted(list(permitted_tiers))}, "
            f"but action requires Tier {action_tier} authorization."
        )
