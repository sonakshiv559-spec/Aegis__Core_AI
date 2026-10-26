# AegisCore AI: Data Models & Schema Specifications

This specification defines the core data schemas utilized across AegisCore AI, aligned with the **Open Cybersecurity Schema Framework (OCSF)** and implemented via Pydantic v2.

---

## 1. OCSF Normalized Event Model

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class OCSFEvent(BaseModel):
    event_id: str = Field(..., description="Globally unique UUID for the event")
    tenant_id: str = Field(..., description="Mandatory tenant boundary identifier")
    time_observed: datetime = Field(..., description="Timestamp recorded by originating system")
    time_ingested: datetime = Field(..., description="Timestamp ingested by AegisCore platform")
    
    # Source Reference
    source_product: str = Field(..., description="e.g., AWS CloudTrail, CrowdStrike Falcon, Okta")
    source_event_id: str = Field(..., description="Original raw event identifier")
    raw_event_ref: str = Field(..., description="S3/MinIO URI pointer to immutable raw payload")
    
    # Classification
    event_class: str = Field(..., description="OCSF Class: e.g., Authentication, Network Activity")
    activity_name: str = Field(..., description="Specific activity: Logon, TokenGeneration, PolicyChange")
    outcome: str = Field(..., description="Success, Failure, Unknown")
    
    # Entities
    actor: Optional[Dict[str, Any]] = None
    target: Optional[Dict[str, Any]] = None
    device: Optional[Dict[str, Any]] = None
    network: Optional[Dict[str, Any]] = None
    
    schema_version: str = "1.1.0"
    parser_version: str = "1.0.0"
```

---

## 2. Multi-Dimensional Scoring Schema

Rather than reducing incident severity to a single opaque float value, AegisCore tracks five explicit risk dimensions:

```python
class IncidentScore(BaseModel):
    anomaly_score: float = Field(..., ge=0.0, le=1.0, description="Statistical deviation from baseline")
    threat_confidence: float = Field(..., ge=0.0, le=1.0, description="Probability of deliberate malicious behavior")
    business_impact: float = Field(..., ge=0.0, le=1.0, description="Criticality of affected systems from Neo4j graph")
    action_risk: float = Field(..., ge=0.0, le=1.0, description="Invasiveness and potential collateral damage of fix")
    evidence_sufficiency: float = Field(..., ge=0.0, le=1.0, description="Completeness of required corroborating evidence")
    
    def requires_human_approval(self) -> bool:
        """Deterministic policy rule for authorization gating."""
        if self.action_risk > 0.3 or self.business_impact > 0.5:
            return True
        if self.evidence_sufficiency < 0.8:
            return True
        return False
```

---

## 3. Incident State Dossier

```python
from enum import Enum

class IncidentStatus(str, Enum):
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    EXECUTING = "EXECUTING"
    VERIFYING = "VERIFYING"
    CONTAINED = "CONTAINED"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"

class CandidateAction(BaseModel):
    action_id: str
    action_type: str  # e.g., RevokeToken, IsolateHost, BlockIP, UpdateSecurityGroup
    target_entity_id: str
    target_entity_type: str
    predicted_blast_radius: List[str]  # IDs of dependent services affected
    reversibility_score: float  # 0.0 (irreversible) to 1.0 (instantly reversible)
    required_evidence_predicates: List[str]
    estimated_containment_benefit: float

class IncidentRecord(BaseModel):
    incident_id: str
    tenant_id: str
    status: IncidentStatus
    trigger_event_ids: List[str]
    affected_entities: List[str]
    
    # Reasoning & Graph Context
    scores: IncidentScore
    candidate_actions: List[CandidateAction]
    selected_action: Optional[CandidateAction] = None
    
    # Audit & Approval
    policy_version: str
    approver_identity: Optional[str] = None
    approval_timestamp: Optional[datetime] = None
    
    # Post-Execution Verification
    execution_result: Optional[Dict[str, Any]] = None
    postcondition_verified: Optional[bool] = None
    service_health_check_passed: Optional[bool] = None
```

---

## 4. Postcondition Verification Contract

```python
class VerificationContract(BaseModel):
    action_id: str
    idempotency_key: str
    preconditions: Dict[str, Any]  # e.g., {"session_active": True}
    postconditions: Dict[str, Any] # e.g., {"session_active": False, "revocation_observed": True}
    service_health_endpoints: List[str] # Healthcheck URLs of dependent services
    timeout_seconds: int = 60
    fallback_action_id: Optional[str] = None
```
