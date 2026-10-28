"""
AegisCore AI – FastAPI Control Plane
Entry point: apps/api/main.py
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from database import db_engine, create_tables
from routers import events, incidents, health, graph, policies, response, verification, benchmarks

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Startup / shutdown lifecycle."""
    logger.info("aegiscore.api.startup", env=settings.AEGISCORE_ENV)
    await create_tables()
    yield
    logger.info("aegiscore.api.shutdown")
    await db_engine.dispose()


app = FastAPI(
    title="AegisCore AI – Control Plane",
    description=(
        "Evidence-Driven • Business-Impact-Aware • "
        "Policy-Constrained • Verified Cybersecurity Response"
    ),
    version="0.9.4-preview",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS (allow dashboard dev server) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(events.router,    prefix="/api/v1", tags=["Telemetry Ingestion"])
app.include_router(incidents.router, prefix="/api/v1", tags=["Incidents"])
app.include_router(graph.router,     prefix="/api/v1", tags=["Context Graph"])
app.include_router(policies.router,  prefix="/api/v1", tags=["Policies & Governance"])
app.include_router(response.router,      prefix="/api/v1", tags=["Response & Execution"])
app.include_router(verification.router,  prefix="/api/v1", tags=["Closed-Loop Verification"])
app.include_router(benchmarks.router,    prefix="/api/v1", tags=["Benchmarks & Evaluation"])


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    logger.error("aegiscore.api.unhandled_error", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal platform error. See audit log."},
    )
