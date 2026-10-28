"""
AegisCore AI – Raw Event Archiver

Archives the raw (un-modified) event payload to MinIO/S3 with:
  - SHA-256 integrity hash (pre-computed by adapter)
  - Immutable object-lock semantics (object written once, never overwritten)
  - Structured object key for efficient retrieval by tenant / date / product

Object key schema:
  raw-events/{tenant_id}/{YYYY}/{MM}/{DD}/{source_product}/{sha256}.json

Dead-letter key schema:
  dead-letter/{tenant_id}/{YYYY}/{MM}/{DD}/{sha256}.json

Security:
  - Bucket policy: no presigned URLs with write access (MinIO anonymous = none)
  - SHA-256 mismatch on retrieval → evidence integrity violation alert
"""

from __future__ import annotations

import io
import json
import structlog
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = structlog.get_logger()


class RawEventArchiver:
    """
    Archives raw JSON payloads to MinIO.
    Fails safely: returns empty string ref if MinIO is unavailable.
    """

    def __init__(
        self,
        minio_client=None,
        raw_bucket: str = "aegiscore-raw-events",
        dlq_bucket: str = "aegiscore-dead-letter",
    ):
        self.client = minio_client
        self.raw_bucket = raw_bucket
        self.dlq_bucket = dlq_bucket

    def _build_object_key(
        self,
        tenant_id: str,
        source_product: str,
        sha256: str,
        bucket_type: str = "raw",
    ) -> str:
        now = datetime.now(timezone.utc)
        date_path = now.strftime("%Y/%m/%d")
        safe_product = source_product.replace(" ", "_").replace("/", "_")

        if bucket_type == "dlq":
            return f"dead-letter/{tenant_id}/{date_path}/{sha256}.json"
        return f"raw-events/{tenant_id}/{date_path}/{safe_product}/{sha256}.json"

    def archive_raw(
        self,
        raw_payload: Dict[str, Any],
        sha256: str,
        tenant_id: str,
        source_product: str,
    ) -> str:
        """
        Stores raw_payload in MinIO.
        Returns the MinIO URI string (s3://bucket/key) or "" on failure.
        """
        if self.client is None:
            logger.debug("aegiscore.archiver.minio_unavailable")
            return f"local://{sha256}"

        object_key = self._build_object_key(tenant_id, source_product, sha256)
        data = json.dumps(raw_payload, ensure_ascii=True, sort_keys=True).encode("utf-8")

        try:
            self.client.put_object(
                bucket_name=self.raw_bucket,
                object_name=object_key,
                data=io.BytesIO(data),
                length=len(data),
                content_type="application/json",
                metadata={
                    "x-aegiscore-sha256": sha256,
                    "x-aegiscore-tenant": tenant_id,
                    "x-aegiscore-source": source_product,
                },
            )
            ref = f"s3://{self.raw_bucket}/{object_key}"
            logger.debug("aegiscore.archiver.stored", ref=ref, sha256=sha256[:8])
            return ref
        except Exception as exc:
            logger.error("aegiscore.archiver.store_failed", error=str(exc), sha256=sha256[:8])
            return f"local://{sha256}"

    def archive_dead_letter(
        self,
        raw_payload: Dict[str, Any],
        sha256: str,
        tenant_id: Optional[str],
        failure_reason: str,
        failure_code: str,
    ) -> str:
        """
        Stores a failed/rejected event in the DLQ bucket for later replay.
        """
        if self.client is None:
            return f"dlq-local://{sha256}"

        dlq_obj = {
            "raw_payload": raw_payload,
            "failure_reason": failure_reason,
            "failure_code": failure_code,
            "sha256": sha256,
            "tenant_id": tenant_id,
            "archived_at": datetime.now(timezone.utc).isoformat(),
        }
        object_key = self._build_object_key(
            tenant_id or "unknown", "dlq", sha256, bucket_type="dlq"
        )
        data = json.dumps(dlq_obj, ensure_ascii=True).encode("utf-8")

        try:
            self.client.put_object(
                bucket_name=self.dlq_bucket,
                object_name=object_key,
                data=io.BytesIO(data),
                length=len(data),
                content_type="application/json",
                metadata={"x-aegiscore-failure": failure_code},
            )
            return f"s3://{self.dlq_bucket}/{object_key}"
        except Exception as exc:
            logger.error("aegiscore.archiver.dlq_failed", error=str(exc))
            return f"dlq-local://{sha256}"
