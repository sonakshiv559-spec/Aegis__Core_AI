"""
AegisCore AI – Ingestion Adapters
Base class for all telemetry source adapters.

Each adapter converts a vendor-specific raw JSON payload into an OCSFEvent.
Adapters must NOT modify or truncate raw payloads – they only map fields.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import hashlib
import json


class BaseAdapter(ABC):
    """
    Abstract base for all telemetry source adapters.

    Subclasses implement `can_handle` (source detection) and
    `to_ocsf_fields` (field mapping). The base class handles SHA-256
    hashing of the raw payload and common field scaffolding.
    """

    # Override in subclasses
    SOURCE_PRODUCT: str = "Unknown"

    @classmethod
    def compute_sha256(cls, raw: Dict[str, Any]) -> str:
        """SHA-256 of canonical JSON representation of the raw payload."""
        canonical = json.dumps(raw, sort_keys=True, ensure_ascii=True)
        return hashlib.sha256(canonical.encode()).hexdigest()

    @classmethod
    @abstractmethod
    def can_handle(cls, raw: Dict[str, Any]) -> bool:
        """
        Returns True if this adapter recognises the raw event shape.
        Used by the adapter registry for auto-detection.
        """
        ...

    @abstractmethod
    def to_ocsf_fields(self, raw: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        """
        Maps raw vendor fields to OCSFEvent field names.
        Returns a dict suitable for **OCSFEvent(**fields).

        Contract:
        - MUST set: tenant_id, source_product, source_event_id,
          event_class, activity_name, outcome, time_observed
        - MUST NOT include: raw_event_ref, raw_sha256 (set by pipeline)
        - Untrusted string data (user agents, hostnames) goes into
          actor/target/device/network sub-models, never into top-level fields.
        """
        ...

    def adapt(self, raw: Dict[str, Any], tenant_id: str) -> Optional[Dict[str, Any]]:
        """
        Public entry point called by the ingestion pipeline.
        Returns mapped OCSF fields dict or None if the event is not handleable.
        """
        if not self.can_handle(raw):
            return None
        fields = self.to_ocsf_fields(raw, tenant_id)
        fields["raw_sha256"] = self.compute_sha256(raw)
        return fields
