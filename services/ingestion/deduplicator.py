"""
AegisCore AI – Event Deduplicator

Detects and suppresses duplicate event submissions using Redis.

Deduplication strategy:
  - Key: SHA-256 of (tenant_id + source_event_id + source_product)
  - TTL: configurable (default 24 h)

Clock-skew correction:
  - Events timestamped more than MAX_CLOCK_SKEW seconds in the future
    are flagged and corrected using server ingestion time.
  - Events timestamped more than STALE_EVENT_HOURS in the past
    are accepted but flagged with a staleness warning.

Thread/task safety: Uses Redis SET NX (atomic) for distributed locking.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

import structlog

logger = structlog.get_logger()

# Maximum acceptable future timestamp drift (5 minutes)
MAX_CLOCK_SKEW_SECONDS: int = 300
# Events older than this are logged as stale (but still accepted)
STALE_EVENT_HOURS: int = 24


class DeduplicationResult:
    def __init__(self, is_duplicate: bool, dedup_key: str, staleness_warning: str = ""):
        self.is_duplicate = is_duplicate
        self.dedup_key = dedup_key
        self.staleness_warning = staleness_warning


class EventDeduplicator:
    """
    Uses Redis SETNX (set-if-not-exists) for atomic deduplication.
    Falls back gracefully if Redis is unavailable (accepts event).
    """

    def __init__(
        self,
        redis_client=None,
        ttl_seconds: int = 86_400,
    ):
        self.redis = redis_client
        self.ttl_seconds = ttl_seconds

    @staticmethod
    def compute_dedup_key(
        tenant_id: str,
        source_product: str,
        source_event_id: str,
    ) -> str:
        """
        Stable deduplication key: SHA-256(tenant + product + source_event_id).
        Includes tenant to prevent cross-tenant collision suppression.
        """
        payload = f"{tenant_id}::{source_product}::{source_event_id}"
        return "aegiscore:dedup:" + hashlib.sha256(payload.encode()).hexdigest()

    def check_and_mark(
        self,
        tenant_id: str,
        source_product: str,
        source_event_id: str,
        time_observed: datetime,
    ) -> DeduplicationResult:
        """
        Synchronous check-and-mark (use async variant for async contexts).
        Returns DeduplicationResult indicating if this is a duplicate.
        """
        dedup_key = self.compute_dedup_key(tenant_id, source_product, source_event_id)

        # Clock-skew detection
        staleness_warning = self._check_clock_skew(time_observed)

        if self.redis is None:
            # No Redis: accept all events (dedup disabled)
            logger.debug("aegiscore.dedup.redis_unavailable", key=dedup_key)
            return DeduplicationResult(
                is_duplicate=False,
                dedup_key=dedup_key,
                staleness_warning=staleness_warning,
            )

        try:
            # SET key "1" NX EX ttl (atomic set-if-not-exists)
            was_set = self.redis.set(dedup_key, "1", nx=True, ex=self.ttl_seconds)
            is_dup = not was_set  # key already existed → duplicate
            if is_dup:
                logger.info(
                    "aegiscore.dedup.duplicate_suppressed",
                    source=source_product,
                    event_id=source_event_id,
                )
            return DeduplicationResult(
                is_duplicate=is_dup,
                dedup_key=dedup_key,
                staleness_warning=staleness_warning,
            )
        except Exception as exc:
            logger.warning("aegiscore.dedup.redis_error", error=str(exc))
            # Redis failure → accept event (fail open, log warning)
            return DeduplicationResult(
                is_duplicate=False,
                dedup_key=dedup_key,
                staleness_warning=staleness_warning,
            )

    async def async_check_and_mark(
        self,
        tenant_id: str,
        source_product: str,
        source_event_id: str,
        time_observed: datetime,
    ) -> DeduplicationResult:
        """Async variant for use in async ingestion pipelines."""
        dedup_key = self.compute_dedup_key(tenant_id, source_product, source_event_id)
        staleness_warning = self._check_clock_skew(time_observed)

        if self.redis is None:
            return DeduplicationResult(False, dedup_key, staleness_warning)

        try:
            was_set = await self.redis.set(dedup_key, "1", nx=True, ex=self.ttl_seconds)
            is_dup = not was_set
            if is_dup:
                logger.info(
                    "aegiscore.dedup.duplicate_suppressed",
                    source=source_product,
                    event_id=source_event_id,
                )
            return DeduplicationResult(is_dup, dedup_key, staleness_warning)
        except Exception as exc:
            logger.warning("aegiscore.dedup.redis_error", error=str(exc))
            return DeduplicationResult(False, dedup_key, staleness_warning)

    @staticmethod
    def _check_clock_skew(time_observed: datetime) -> str:
        """Returns a warning string if the event timestamp is anomalous."""
        now_utc = datetime.now(timezone.utc)

        # Ensure timezone-aware comparison
        if time_observed.tzinfo is None:
            time_observed = time_observed.replace(tzinfo=timezone.utc)

        delta_seconds = (time_observed - now_utc).total_seconds()

        if delta_seconds > MAX_CLOCK_SKEW_SECONDS:
            return (
                f"FUTURE_TIMESTAMP: event is {delta_seconds:.0f}s in the future "
                f"(max allowed: {MAX_CLOCK_SKEW_SECONDS}s). "
                "Timestamp corrected to ingestion time."
            )

        if delta_seconds < -(STALE_EVENT_HOURS * 3600):
            hours_old = abs(delta_seconds) / 3600
            return (
                f"STALE_EVENT: event is {hours_old:.1f}h old "
                f"(threshold: {STALE_EVENT_HOURS}h). Accepted with warning."
            )

        return ""
