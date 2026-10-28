"""
AegisCore AI – OCSF Normalised Event Schema (Pydantic v2)
Aligned with Open Cybersecurity Schema Framework v1.1.0
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
import uuid


class SourceProvenance(BaseModel):
    """Traces a claim back to a specific raw telemetry record."""
    event_id: str
    source_product: str
    time_observed: str
    raw_event_ref: Optional[str] = None


class OCSFActor(BaseModel):
    """The entity initiating the action."""
    user_name: Optional[str] = None
    user_uid: Optional[str] = None
    process_name: Optional[str] = None
    session_uid: Optional[str] = None
    ip_addr: Optional[str] = None
    user_agent: Optional[str] = None
    extras: Dict[str, Any] = Field(default_factory=dict)


class OCSFTarget(BaseModel):
    """The entity acted upon."""
    resource_name: Optional[str] = None
    resource_type: Optional[str] = None
    resource_uid: Optional[str] = None
    ip_addr: Optional[str] = None
    port: Optional[int] = None
    extras: Dict[str, Any] = Field(default_factory=dict)


class OCSFDevice(BaseModel):
    """Source device / endpoint metadata."""
    hostname: Optional[str] = None
    ip_addr: Optional[str] = None
    mac_addr: Optional[str] = None
    os_name: Optional[str] = None
    agent_version: Optional[str] = None
    extras: Dict[str, Any] = Field(default_factory=dict)


class OCSFNetwork(BaseModel):
    """Network context for the event."""
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    protocol: Optional[str] = None
    direction: Optional[str] = None  # inbound | outbound | lateral
    extras: Dict[str, Any] = Field(default_factory=dict)


class OCSFEvent(BaseModel):
    """
    Normalised OCSF telemetry event.

    Every ingested event is validated against this model.
    Raw payloads are NEVER passed directly to LLM context — they are
    stored as untrusted data with SHA-256 integrity hashes in MinIO.
    """

    # ── Identity ─────────────────────────────────────────────
    event_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="AegisCore-assigned globally unique event identifier",
    )
    tenant_id: str = Field(..., description="Mandatory tenant boundary identifier")

    # ── Timestamps ───────────────────────────────────────────
    time_observed: datetime = Field(
        ..., description="Timestamp recorded by the originating system"
    )
    time_ingested: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp ingested by AegisCore",
    )

    # ── Source Reference ─────────────────────────────────────
    source_product: str = Field(
        ..., description="e.g. 'Okta Identity', 'CrowdStrike Falcon', 'AWS CloudTrail'"
    )
    source_event_id: str = Field(
        ..., description="Original raw vendor-assigned event identifier"
    )
    raw_event_ref: str = Field(
        default="",
        description="MinIO URI pointer to immutable raw payload (set after archiving)",
    )
    raw_sha256: str = Field(
        default="",
        description="SHA-256 hash of raw payload for integrity verification",
    )

    # ── OCSF Classification ──────────────────────────────────
    event_class: str = Field(
        ...,
        description=(
            "OCSF class name: Authentication | NetworkActivity | "
            "EndpointActivity | CloudActivity | PolicyChange"
        ),
    )
    activity_name: str = Field(
        ...,
        description="Specific activity: Logon | TokenGeneration | FileAccess | ProcessSpawn",
    )
    outcome: str = Field(
        ..., description="Success | Failure | Unknown"
    )

    # ── Structured Entities (not raw strings — safe for LLM context) ─
    actor: Optional[OCSFActor] = None
    target: Optional[OCSFTarget] = None
    device: Optional[OCSFDevice] = None
    network: Optional[OCSFNetwork] = None

    # ── Schema Metadata ──────────────────────────────────────
    schema_version: str = "1.1.0"
    parser_version: str = "1.0.0"

    @field_validator("outcome")
    @classmethod
    def validate_outcome(cls, v: str) -> str:
        allowed = {"Success", "Failure", "Unknown"}
        if v not in allowed:
            raise ValueError(f"outcome must be one of {allowed}, got '{v}'")
        return v

    @field_validator("event_class")
    @classmethod
    def validate_event_class(cls, v: str) -> str:
        allowed = {
            "Authentication", "NetworkActivity", "EndpointActivity",
            "CloudActivity", "PolicyChange", "FileActivity",
            "ProcessActivity", "SystemActivity",
        }
        if v not in allowed:
            raise ValueError(f"event_class must be one of {allowed}, got '{v}'")
        return v


class ValidationFailure(BaseModel):
    """Represents an event that failed validation and was routed to DLQ."""
    source_product: Optional[str] = None
    tenant_id: Optional[str] = None
    raw_payload: Dict[str, Any]
    raw_sha256: str
    failure_reason: str
    failure_code: str  # MISSING_FIELD | INVALID_ENUM | CLOCK_SKEW | DUPLICATE
    dlq_ref: str = ""


class IngestionBatchResult(BaseModel):
    """Summary result of processing an event batch."""
    total: int
    accepted: int
    rejected: int
    duplicate: int
    dlq_count: int
    accepted_event_ids: List[str] = Field(default_factory=list)
    failures: List[ValidationFailure] = Field(default_factory=list)
