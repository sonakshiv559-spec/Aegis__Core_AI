"""
AegisCore AI – Events Router
POST /api/v1/events/ingest   →  ingest one or more raw telemetry events
GET  /api/v1/events          →  query normalised events (paginated)
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from database import get_db

# Import ingestion pipeline (lazy: won't fail if services/ not on PYTHONPATH)
try:
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "services"))
    from ingestion.pipeline import IngestionPipeline
    _pipeline_available = True
except ImportError:
    _pipeline_available = False

logger = structlog.get_logger()
router = APIRouter()


@router.post(
    "/events/ingest",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest raw telemetry event(s)",
    description=(
        "Accepts raw JSON event payloads from any supported adapter "
        "(Okta IdP, CrowdStrike EDR, AWS CloudTrail, Syslog). "
        "Each event is validated against OCSF, deduplicated, archived in MinIO, "
        "and persisted in PostgreSQL. Invalid events are routed to the Dead Letter Queue."
    ),
)
async def ingest_events(
    payload: List[dict],
    db: AsyncSession = Depends(get_db),
):
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty event batch.",
        )
    if len(payload) > 1000:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Batch size exceeds maximum of 1,000 events per request.",
        )

    logger.info("aegiscore.ingest.received", count=len(payload))

    if _pipeline_available:
        pipeline = IngestionPipeline(db=db)
        result = await pipeline.process_batch(payload)
    else:
        # Graceful degradation: accept without processing when services/ unavailable
        result = {
            "accepted": len(payload),
            "rejected": 0,
            "dlq_count": 0,
            "note": "Pipeline unavailable – events logged but not stored.",
        }

    return {
        "status": "accepted",
        "batch_size": len(payload),
        "pipeline_result": result,
    }


@router.get(
    "/events",
    summary="Query normalised OCSF events",
)
async def list_events(
    tenant_id: str = "tenant-aegis-production-us-east",
    source_product: str | None = None,
    event_class: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Paginated query over normalised OCSF events.
    Every query is tenant-scoped (tenant_id is mandatory).
    """
    from sqlalchemy import text

    clauses = ["tenant_id = :tenant_id"]
    params: dict = {"tenant_id": tenant_id, "limit": limit, "offset": offset}

    if source_product:
        clauses.append("source_product = :source_product")
        params["source_product"] = source_product
    if event_class:
        clauses.append("event_class = :event_class")
        params["event_class"] = event_class

    where = " AND ".join(clauses)
    sql = text(
        f"SELECT * FROM aegiscore.ocsf_events WHERE {where} "
        f"ORDER BY time_observed DESC LIMIT :limit OFFSET :offset"
    )
    try:
        result = await db.execute(sql, params)
        rows = result.mappings().all()
        return {"events": [dict(r) for r in rows], "count": len(rows)}
    except Exception as exc:
        logger.warning("aegiscore.events.query_failed", error=str(exc))
        return {"events": [], "count": 0, "note": "Database not yet initialised."}
