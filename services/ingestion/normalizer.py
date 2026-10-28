"""
AegisCore AI – Ingestion Normalizer

Routes a raw event dict through the adapter registry to produce a
validated OCSFEvent, or surfaces a structured ValidationFailure.

Security note: Raw payloads are treated as UNTRUSTED DATA throughout.
They are hashed, archived in MinIO, and the untrusted strings are
confined inside the OCSFEvent sub-models (actor, target, device, network)
rather than being surfaced as free-text to any LLM context.
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

import structlog

from schemas.ocsf import OCSFEvent, ValidationFailure
from services.ingestion.adapters import ADAPTER_REGISTRY, BaseAdapter

logger = structlog.get_logger()


class NormalizationResult:
    """Typed result: exactly one of (event, failure) will be set."""

    def __init__(
        self,
        event: Optional[OCSFEvent] = None,
        failure: Optional[ValidationFailure] = None,
    ):
        self.event = event
        self.failure = failure
        self.is_valid = event is not None

    @classmethod
    def ok(cls, event: OCSFEvent) -> "NormalizationResult":
        return cls(event=event)

    @classmethod
    def fail(cls, failure: ValidationFailure) -> "NormalizationResult":
        return cls(failure=failure)


class EventNormalizer:
    """
    Selects the appropriate adapter from the registry and validates the
    resulting OCSFEvent via Pydantic.

    Never modifies raw_payload. Stores sha256 for integrity verification.
    """

    def __init__(self, default_tenant_id: str = "tenant-aegis-production-us-east"):
        self.default_tenant_id = default_tenant_id

    def normalize(
        self, raw: Dict[str, Any], tenant_id: Optional[str] = None
    ) -> NormalizationResult:
        """
        Normalises one raw event.

        1. Computes SHA-256 of raw payload.
        2. Selects adapter.
        3. Maps fields → OCSFEvent.
        4. Validates via Pydantic.
        """
        effective_tenant = tenant_id or raw.get("tenant_id") or self.default_tenant_id

        # Find the right adapter
        adapter_cls: Optional[type[BaseAdapter]] = None
        for cls in ADAPTER_REGISTRY:
            if cls.can_handle(raw):
                adapter_cls = cls
                break

        if adapter_cls is None:
            sha = BaseAdapter.compute_sha256(raw)
            return NormalizationResult.fail(
                ValidationFailure(
                    source_product=raw.get("source_product") or raw.get("eventSource"),
                    tenant_id=effective_tenant,
                    raw_payload=raw,
                    raw_sha256=sha,
                    failure_reason=(
                        "No adapter recognised this event shape. "
                        "Ensure the payload contains vendor-specific discriminator fields."
                    ),
                    failure_code="NO_ADAPTER",
                )
            )

        adapter = adapter_cls()
        try:
            fields = adapter.adapt(raw, effective_tenant)
            if fields is None:
                sha = BaseAdapter.compute_sha256(raw)
                return NormalizationResult.fail(
                    ValidationFailure(
                        source_product=adapter_cls.SOURCE_PRODUCT,
                        tenant_id=effective_tenant,
                        raw_payload=raw,
                        raw_sha256=sha,
                        failure_reason="Adapter declined the event.",
                        failure_code="ADAPTER_DECLINED",
                    )
                )

            # Validate via Pydantic schema
            event = OCSFEvent(**fields)
            logger.debug(
                "aegiscore.normalizer.accepted",
                event_id=event.event_id,
                source=event.source_product,
                class_=event.event_class,
            )
            return NormalizationResult.ok(event)

        except Exception as exc:
            sha = adapter_cls.compute_sha256(raw)
            failure_code = "VALIDATION_ERROR"
            if "outcome" in str(exc) or "event_class" in str(exc):
                failure_code = "INVALID_ENUM"
            logger.warning(
                "aegiscore.normalizer.rejected",
                adapter=adapter_cls.SOURCE_PRODUCT,
                error=str(exc),
            )
            return NormalizationResult.fail(
                ValidationFailure(
                    source_product=adapter_cls.SOURCE_PRODUCT,
                    tenant_id=effective_tenant,
                    raw_payload=raw,
                    raw_sha256=sha,
                    failure_reason=str(exc),
                    failure_code=failure_code,
                )
            )
