"""
AegisCore AI – Schema Validator & Dead Letter Queue Router

Validates normalised OCSFEvents against mandatory field constraints
beyond Pydantic: cross-field rules, evidence predicates, tenant checks.

DLQ routing policy:
  - MISSING_FIELD    → mandatory field absent
  - INVALID_ENUM     → invalid outcome / event_class value
  - CLOCK_SKEW       → event more than 5 min in the future
  - DUPLICATE        → already processed (dedup key exists in Redis)
  - NO_ADAPTER       → no adapter matched the raw payload shape
  - TENANT_MISMATCH  → tenant_id in payload ≠ auth context tenant_id
"""

from __future__ import annotations

from typing import List, Optional, Tuple
import structlog

from schemas.ocsf import OCSFEvent, ValidationFailure

logger = structlog.get_logger()


class ValidationResult:
    def __init__(
        self,
        is_valid: bool,
        event: Optional[OCSFEvent] = None,
        failure: Optional[ValidationFailure] = None,
        warnings: Optional[List[str]] = None,
    ):
        self.is_valid = is_valid
        self.event = event
        self.failure = failure
        self.warnings: List[str] = warnings or []

    @classmethod
    def ok(cls, event: OCSFEvent, warnings: Optional[List[str]] = None) -> "ValidationResult":
        return cls(is_valid=True, event=event, warnings=warnings or [])

    @classmethod
    def fail(cls, failure: ValidationFailure) -> "ValidationResult":
        return cls(is_valid=False, failure=failure)


class SchemaValidator:
    """
    Post-normalisation validator applying cross-field and platform rules.
    Called after the normalizer has successfully produced an OCSFEvent.
    """

    def __init__(self, expected_tenant_id: Optional[str] = None):
        self.expected_tenant_id = expected_tenant_id

    def validate(
        self,
        event: OCSFEvent,
        raw_payload: dict,
        staleness_warning: str = "",
    ) -> ValidationResult:
        warnings: List[str] = []

        # ── Rule 1: Tenant boundary enforcement ──────────────────
        if (
            self.expected_tenant_id
            and event.tenant_id != self.expected_tenant_id
        ):
            return ValidationResult.fail(
                ValidationFailure(
                    source_product=event.source_product,
                    tenant_id=event.tenant_id,
                    raw_payload=raw_payload,
                    raw_sha256=event.raw_sha256,
                    failure_reason=(
                        f"Tenant mismatch: payload claims '{event.tenant_id}', "
                        f"auth context expects '{self.expected_tenant_id}'."
                    ),
                    failure_code="TENANT_MISMATCH",
                )
            )

        # ── Rule 2: source_event_id must be non-empty ─────────────
        if not event.source_event_id or event.source_event_id.strip() == "":
            return ValidationResult.fail(
                ValidationFailure(
                    source_product=event.source_product,
                    tenant_id=event.tenant_id,
                    raw_payload=raw_payload,
                    raw_sha256=event.raw_sha256,
                    failure_reason="source_event_id is empty; cannot guarantee idempotency.",
                    failure_code="MISSING_FIELD",
                )
            )

        # ── Rule 3: Attach staleness / clock-skew warning ─────────
        if staleness_warning:
            warnings.append(staleness_warning)
            if "FUTURE_TIMESTAMP" in staleness_warning:
                # Correct timestamp to ingestion time
                from datetime import datetime, timezone
                object.__setattr__(event, "time_observed", datetime.now(timezone.utc))
                warnings.append("time_observed corrected to server ingestion time.")

        # ── Rule 4: Evidence richness check (informational) ───────
        if event.actor is None and event.device is None:
            warnings.append(
                "LOW_EVIDENCE: event has neither actor nor device context. "
                "Evidence sufficiency scoring may be reduced."
            )

        logger.debug(
            "aegiscore.validator.passed",
            event_id=event.event_id,
            warnings=len(warnings),
        )
        return ValidationResult.ok(event, warnings)
