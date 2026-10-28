"""
AegisCore AI – Policies & Action Governance Router
Exposes policy versions, tier definitions, evidence predicates, and authorization rules.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
import structlog

from services.policy.rules import (
    ACTION_EVIDENCE_PREDICATES,
    ACTION_TIER_DEFINITIONS,
    POLICY_VERSION,
    ROLE_PERMITTED_TIERS,
)
from services.policy.engine import PolicyEngine

logger = structlog.get_logger()
router = APIRouter()
_engine = PolicyEngine()


@router.get(
    "/policies",
    summary="Get active response governance policies & tier definitions",
    description="Returns deterministic rules, tier limits, evidence predicate checklists, and RBAC matrices.",
)
async def get_policies():
    return {
        "policy_version": POLICY_VERSION,
        "operating_modes": {
            "approval_mode": "Default. All Tier >= 1 actions mandate authenticated human authorization.",
            "automatic_mode": "Explicit opt-in. Restricted strictly to Tier 0 and sandbox Tier 1.",
        },
        "action_tiers": ACTION_TIER_DEFINITIONS,
        "mandatory_evidence_predicates": ACTION_EVIDENCE_PREDICATES,
        "rbac_role_permissions": {k: sorted(list(v)) for k, v in ROLE_PERMITTED_TIERS.items()},
    }
