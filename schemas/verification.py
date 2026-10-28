"""
AegisCore AI – Postcondition Verification Contract Schema
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VerificationContract(BaseModel):
    action_id: str
    idempotency_key: str
    preconditions: Dict[str, Any] = Field(
        ..., description="Machine-checkable baseline state before action execution"
    )
    postconditions: Dict[str, Any] = Field(
        ..., description="Machine-checkable target state after action execution"
    )
    service_health_endpoints: List[str] = Field(
        default_factory=list, description="Healthcheck endpoints of upstream/dependent services"
    )
    timeout_seconds: int = 60
    fallback_action_id: Optional[str] = None
