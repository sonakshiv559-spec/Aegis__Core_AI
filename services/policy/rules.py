"""
AegisCore AI – Policy Specifications & Action Predicate Catalog (USP 2)
Deterministic rules, evidence predicate requirements, action tiering, and RBAC matrix.
Completely isolated from LLM weights.
"""

from __future__ import annotations

from typing import Dict, List, Set


# ── Action Tiers ─────────────────────────────────────────────────────────────
# Tier 0 (Observe): Read-only log enrichment, network queries, report generation
# Tier 1 (Low-impact reversible): Temporary session revocation, lab quarantine
# Tier 2 (Material): User account disablement, production host quarantine, security group changes
# Tier 3 (Critical / Broad): Core IAM policies, VPC routing, tenant-wide infrastructure
ACTION_TIER_DEFINITIONS = {
    0: {
        "name": "Observe",
        "description": "Read-only discovery, telemetry query, report generation",
        "default_mode": "automatic",
        "allowed_in_automatic_mode": True,
        "required_role": None,
    },
    1: {
        "name": "Low-Impact Reversible",
        "description": "Targeted token revocation, temporary monitoring watch, lab quarantine",
        "default_mode": "automatic_in_sandbox_or_preapproved",
        "allowed_in_automatic_mode": True,
        "max_business_disruption_cost": 0.20,
        "min_reversibility_score": 0.85,
        "required_role": "SOC Tier-2 Analyst",
    },
    2: {
        "name": "Material",
        "description": "Account disablement, production host quarantine, security group updates",
        "default_mode": "approval_required",
        "allowed_in_automatic_mode": False,
        "max_business_disruption_cost": 0.60,
        "min_reversibility_score": 0.50,
        "required_role": "Lead SOC Tier-3 Responder",
    },
    3: {
        "name": "Critical / Broad",
        "description": "Production network policies, core identity infrastructure, tenant lockouts",
        "default_mode": "strong_approval_mandated",
        "allowed_in_automatic_mode": False,
        "max_business_disruption_cost": 1.00,
        "min_reversibility_score": 0.00,
        "required_role": "SecOps Director / CISO",
    },
}


# ── Action-Specific Evidence Predicates (Mandatory Checklist) ─────────────────
# An action CANNOT execute unless its mandatory evidence predicates are verified,
# regardless of how confident the LLM is.
ACTION_EVIDENCE_PREDICATES: Dict[str, List[str]] = {
    "RevokeUserSession": [
        "active_session_confirmed",
        "external_ip_flagged",
    ],
    "IsolateEndpoint": [
        "credential_dump_confirmed",
        "endpoint_telemetry_present",
    ],
    "UpdateSecurityGroup": [
        "security_group_change_logged",
        "public_cidr_confirmed",
    ],
    "DisableServiceAccount": [
        "service_account_login_external",
        "no_mfa_for_service_account",
    ],
}


# ── RBAC Role Hierarchy ───────────────────────────────────────────────────────
# Defines authorized sign-off levels
ROLE_PERMITTED_TIERS: Dict[str, Set[int]] = {
    "SOC Tier-1 Triage": {0},
    "SOC Tier-2 Analyst": {0, 1},
    "Lead SOC Tier-3 Responder": {0, 1, 2},
    "SecOps Lead": {0, 1, 2},
    "SecOps Director / CISO": {0, 1, 2, 3},
    "Platform Admin": {0, 1, 2, 3},
}


# ── Global Safety Limits ──────────────────────────────────────────────────────
POLICY_VERSION = "v1.0.0"
APPROVAL_EXPIRY_MINUTES = 15
MAX_RETRY_COUNT = 2
