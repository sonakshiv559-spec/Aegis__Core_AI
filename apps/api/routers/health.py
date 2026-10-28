"""
AegisCore AI – Health Router
GET /health  →  liveness & readiness probe
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    env: str


@router.get("/health", response_model=HealthResponse, summary="Platform health check")
async def health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version="0.9.4-preview",
        env="development",
    )
