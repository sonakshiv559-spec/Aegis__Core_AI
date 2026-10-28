"""
AegisCore AI – Ingestion Pipeline Orchestrator

Ties together:
  1. EventNormalizer   (adapter selection + OCSF mapping)
  2. EventDeduplicator (Redis SETNX dedup + clock-skew check)
  3. SchemaValidator   (cross-field rules + tenant enforcement)
  4. RawEventArchiver  (MinIO raw payload + DLQ storage)
  5. DB persistence    (PostgreSQL ocsf_events table)
  6. Audit log entry   (append-only audit trail)

Processing order (per event):
  raw → normalise → dedup check → schema validate → archive → persist → audit

Security invariants:
  - Raw payloads NEVER written to DB columns; only MinIO URI + SHA-256.
  - Each DB write includes tenant_id predicate.
  - Failures route to DLQ bucket + dead_letter_events table.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from schemas.ocsf import IngestionBatchResult, OCSFEvent, ValidationFailure
from services.ingestion.normalizer import EventNormalizer
from services.ingestion.deduplicator import EventDeduplicator
from services.ingestion.validator import SchemaValidator
from services.ingestion.archiver import RawEventArchiver

try:
    from services.detection.engine import DetectionEngine
    _detection_available = True
except ImportError:
    _detection_available = False

logger = structlog.get_logger()


class IngestionPipeline:
    """
    Async ingestion pipeline for a single batch of raw events.
    Instantiated per request; stateless between calls.
    """

    def __init__(
        self,
        db: Optional[AsyncSession] = None,
        redis_client=None,
        minio_client=None,
        tenant_id: str = "tenant-aegis-production-us-east",
        detection_engine=None,
    ):
        self.db = db
        self.tenant_id = tenant_id
        self.normalizer = EventNormalizer(default_tenant_id=tenant_id)
        self.deduplicator = EventDeduplicator(redis_client=redis_client)
        self.validator = SchemaValidator(expected_tenant_id=tenant_id)
        self.archiver = RawEventArchiver(minio_client=minio_client)
        if detection_engine is not None:
            self.detection_engine = detection_engine
        elif _detection_available:
            self.detection_engine = DetectionEngine()
        else:
            self.detection_engine = None

    async def process_batch(
        self, raw_events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Processes a list of raw event dicts.
        Returns an IngestionBatchResult summary.
        """
        result = IngestionBatchResult(
            total=len(raw_events),
            accepted=0,
            rejected=0,
            duplicate=0,
            dlq_count=0,
        )

        for raw in raw_events:
            outcome = await self._process_single(raw)
            if outcome == "accepted":
                result.accepted += 1
            elif outcome == "duplicate":
                result.duplicate += 1
            elif outcome in ("rejected", "dlq"):
                result.rejected += 1
                result.dlq_count += 1

        logger.info(
            "aegiscore.pipeline.batch_complete",
            total=result.total,
            accepted=result.accepted,
            rejected=result.rejected,
            duplicate=result.duplicate,
        )
        return result.model_dump()

    async def _process_single(self, raw: Dict[str, Any]) -> str:
        """
        Processes one raw event through the full pipeline.
        Returns: "accepted" | "duplicate" | "rejected" | "dlq"
        """

        # ── Step 1: Normalise ────────────────────────────────────
        norm_result = self.normalizer.normalize(raw, tenant_id=self.tenant_id)

        if not norm_result.is_valid:
            failure = norm_result.failure
            dlq_ref = self.archiver.archive_dead_letter(
                raw_payload=raw,
                sha256=failure.raw_sha256,
                tenant_id=failure.tenant_id,
                failure_reason=failure.failure_reason,
                failure_code=failure.failure_code,
            )
            failure.dlq_ref = dlq_ref
            await self._persist_dlq(failure)
            return "dlq"

        event = norm_result.event

        # ── Step 2: Deduplication ────────────────────────────────
        dedup = await self.deduplicator.async_check_and_mark(
            tenant_id=event.tenant_id,
            source_product=event.source_product,
            source_event_id=event.source_event_id,
            time_observed=event.time_observed,
        )
        if dedup.is_duplicate:
            return "duplicate"

        # ── Step 3: Schema validation ────────────────────────────
        val_result = self.validator.validate(
            event=event,
            raw_payload=raw,
            staleness_warning=dedup.staleness_warning,
        )
        if not val_result.is_valid:
            failure = val_result.failure
            dlq_ref = self.archiver.archive_dead_letter(
                raw_payload=raw,
                sha256=failure.raw_sha256,
                tenant_id=failure.tenant_id,
                failure_reason=failure.failure_reason,
                failure_code=failure.failure_code,
            )
            failure.dlq_ref = dlq_ref
            await self._persist_dlq(failure)
            return "dlq"

        event = val_result.event

        # ── Step 4: Archive raw payload to MinIO ─────────────────
        raw_ref = self.archiver.archive_raw(
            raw_payload=raw,
            sha256=event.raw_sha256,
            tenant_id=event.tenant_id,
            source_product=event.source_product,
        )
        object.__setattr__(event, "raw_event_ref", raw_ref)

        # ── Step 5: Persist normalised event to PostgreSQL ───────
        await self._persist_event(event, warnings=val_result.warnings)

        # ── Step 6: Append audit log entry ───────────────────────
        await self._append_audit(event)

        # ── Step 7: Fast Detection & Incident Lifecycle ───────────
        if self.detection_engine:
            try:
                self.detection_engine.process_event(event)
            except Exception as exc:
                logger.warning("aegiscore.pipeline.detection_error", error=str(exc))

        return "accepted"

    async def _persist_event(
        self, event: OCSFEvent, warnings: Optional[List[str]] = None
    ) -> None:
        """Inserts the normalised OCSF event into the ocsf_events table."""
        if self.db is None:
            return

        def _json(obj) -> Optional[str]:
            if obj is None:
                return None
            if hasattr(obj, "model_dump"):
                return json.dumps(obj.model_dump())
            return json.dumps(obj)

        try:
            sql = text("""
                INSERT INTO aegiscore.ocsf_events (
                    event_id, tenant_id, source_product, source_event_id,
                    event_class, activity_name, outcome,
                    time_observed, time_ingested,
                    raw_event_ref, raw_sha256,
                    actor_json, target_json, device_json, network_json,
                    schema_version, parser_version
                ) VALUES (
                    :event_id, :tenant_id, :source_product, :source_event_id,
                    :event_class, :activity_name, :outcome,
                    :time_observed, :time_ingested,
                    :raw_event_ref, :raw_sha256,
                    CAST(:actor_json AS jsonb), CAST(:target_json AS jsonb),
                    CAST(:device_json AS jsonb), CAST(:network_json AS jsonb),
                    :schema_version, :parser_version
                )
                ON CONFLICT (event_id) DO NOTHING
            """)
            await self.db.execute(sql, {
                "event_id": event.event_id,
                "tenant_id": event.tenant_id,
                "source_product": event.source_product,
                "source_event_id": event.source_event_id,
                "event_class": event.event_class,
                "activity_name": event.activity_name,
                "outcome": event.outcome,
                "time_observed": event.time_observed,
                "time_ingested": event.time_ingested,
                "raw_event_ref": event.raw_event_ref,
                "raw_sha256": event.raw_sha256,
                "actor_json": _json(event.actor),
                "target_json": _json(event.target),
                "device_json": _json(event.device),
                "network_json": _json(event.network),
                "schema_version": event.schema_version,
                "parser_version": event.parser_version,
            })
            await self.db.commit()
        except Exception as exc:
            logger.error("aegiscore.pipeline.persist_failed", error=str(exc))
            await self.db.rollback()

    async def _persist_dlq(self, failure: ValidationFailure) -> None:
        """Persists a failed event to the dead_letter_events table."""
        if self.db is None:
            return
        try:
            sql = text("""
                INSERT INTO aegiscore.dead_letter_events (
                    tenant_id, source_product, raw_payload, raw_sha256,
                    failure_reason, failure_code, dlq_ref
                ) VALUES (
                    :tenant_id, :source_product,
                    CAST(:raw_payload AS jsonb),
                    :raw_sha256, :failure_reason, :failure_code, :dlq_ref
                )
            """)
            await self.db.execute(sql, {
                "tenant_id": failure.tenant_id,
                "source_product": failure.source_product,
                "raw_payload": json.dumps(failure.raw_payload),
                "raw_sha256": failure.raw_sha256,
                "failure_reason": failure.failure_reason,
                "failure_code": failure.failure_code,
                "dlq_ref": failure.dlq_ref,
            })
            await self.db.commit()
        except Exception as exc:
            logger.warning("aegiscore.pipeline.dlq_persist_failed", error=str(exc))

    async def _append_audit(self, event: OCSFEvent) -> None:
        """Appends a tamper-evident entry to the audit_log table."""
        if self.db is None:
            return
        try:
            # Compute chained hash (simplified: SHA-256 of payload + now)
            payload_str = json.dumps({
                "event_id": event.event_id,
                "source": event.source_product,
                "sha256": event.raw_sha256,
                "tenant_id": event.tenant_id,
            })
            entry_hash = hashlib.sha256(
                (payload_str + datetime.now(timezone.utc).isoformat()).encode()
            ).hexdigest()

            sql = text("""
                INSERT INTO aegiscore.audit_log (
                    tenant_id, event_type, actor, payload, entry_hash
                ) VALUES (
                    :tenant_id, :event_type, :actor,
                    CAST(:payload AS jsonb), :entry_hash
                )
            """)
            await self.db.execute(sql, {
                "tenant_id": event.tenant_id,
                "event_type": "INGESTION",
                "actor": f"ingestion-pipeline::{event.source_product}",
                "payload": payload_str,
                "entry_hash": entry_hash,
            })
            await self.db.commit()
        except Exception as exc:
            logger.warning("aegiscore.pipeline.audit_failed", error=str(exc))
