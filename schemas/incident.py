"""
AegisCore AI – Incident Data Models & Schemas (Pydantic v2)
Compliant with AegisCore Architecture and OCSF Standards.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IncidentStatus(str, Enum):
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    EXECUTING = "EXECUTING"
    VERIFYING = "VERIFYING"
    CONTAINED = "CONTAINED"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"


class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentScore(BaseModel):
    """
    Non-Negotiable Safety Invariant:
    5 Distinct Dimensions. NEVER collapsed into a single number.
    """
    anomaly_score: float = Field(
        ..., ge=0.0, le=1.0, description="Statistical deviation from historical baseline (0.0 to 1.0)"
    )
    threat_confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence in deliberate malicious intent (0.0 to 1.0)"
    )
    business_impact: float = Field(
        ..., ge=0.0, le=1.0, description="Criticality & blast radius of affected dependencies (0.0 to 1.0)"
    )
    action_risk: float = Field(
        ..., ge=0.0, le=1.0, description="Invasiveness and potential collateral damage of fix (0.0 to 1.0)"
    )
    evidence_sufficiency: float = Field(
        ..., ge=0.0, le=1.0, description="Presence of mandatory corroborating telemetry artifacts (0.0 to 1.0)"
    )

    def requires_human_approval(self) -> bool:
        """Deterministic policy rule for authorization gating."""
        if self.action_risk > 0.3 or self.business_impact > 0.5:
            return True
        if self.evidence_sufficiency < 0.8:
            return True
        return False


class AffectedEntity(BaseModel):
    id: str
    name: str
    type: str  # user | service_account | endpoint | cloud_resource | database | service
    criticality: str = "Tier 2"  # Tier 1 | Tier 2 | Tier 3
    owner: Optional[str] = None


class ClaimSourceRef(BaseModel):
    event_id: str
    source_product: str
    time_observed: str
    raw_event_ref: Optional[str] = None


class ClaimItem(BaseModel):
    id: str
    text: str
    is_inference: bool
    source_ref: Optional[ClaimSourceRef] = None


class EvidenceItem(BaseModel):
    id: str
    type: str  # idp | edr | cloud | network | application
    source_product: str
    event_id: str
    observed_at: str
    summary: str
    is_corroborating: bool = True
    is_contradicting: bool = False
    freshness_minutes: float = 0.0
    raw_payload: str  # untrusted content
    is_untrusted: bool = True
    fields: Dict[str, Any] = Field(default_factory=dict)


class CandidateAction(BaseModel):
    action_id: str
    action_type: str  # RevokeUserSession | IsolateEndpoint | BlockIP | UpdateSecurityGroup
    name: str
    tier: int = Field(..., ge=0, le=3, description="0=Observe, 1=Low-impact reversible, 2=Material, 3=Critical")
    target_entity_id: str
    target_entity_name: str
    target_entity_type: str
    predicted_blast_radius: List[str] = Field(default_factory=list)
    reversibility_score: float = Field(..., ge=0.0, le=1.0)
    required_evidence_predicates: List[str] = Field(default_factory=list)
    security_gain: float = Field(..., ge=0.0, le=1.0)
    business_disruption_cost: float = Field(..., ge=0.0, le=1.0)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    policy_version: str = "v1.0.0"


class ContradictionsAndUnknowns(BaseModel):
    contradictions: List[str] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)
    unverified_assumptions: List[str] = Field(default_factory=list)


class AgentTrace(BaseModel):
    agent: str  # Sentry | Investigator | Validator | Planner | Executor | Verifier
    timestamp: str
    observation: str
    uncertainty_notes: Optional[str] = None


class IncidentRecord(BaseModel):
    id: str
    tenant_id: str
    title: str
    status: IncidentStatus = IncidentStatus.NEW
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    created_at: str
    updated_at: str

    scores: IncidentScore
    affected_entities: List[AffectedEntity] = Field(default_factory=list)
    claims: List[ClaimItem] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    candidate_actions: List[CandidateAction] = Field(default_factory=list)
    selected_action: Optional[CandidateAction] = None

    contradictions_and_unknowns: ContradictionsAndUnknowns = Field(
        default_factory=ContradictionsAndUnknowns
    )
    agent_traces: List[AgentTrace] = Field(default_factory=list)
    policy_version: str = "v1.0.0"
