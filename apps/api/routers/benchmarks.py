"""
Benchmarks & Evaluation Router for FastAPI Control Plane (Phase 9)
Provides endpoints to trigger benchmarks, evaluate ablations, and retrieve comparative metrics.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from services.benchmarks.runner import BenchmarkRunner
from services.benchmarks.schemas import BenchmarkSuiteReport, BenchmarkScenario
from services.benchmarks.scenarios import BENCHMARK_SCENARIOS

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

# In-memory cache of the latest benchmark run
_latest_benchmark_report: Dict[str, Any] = None


@router.get("/scenarios", response_model=list[BenchmarkScenario])
async def list_benchmark_scenarios():
    """List all 7 standardized benchmark evaluation scenarios."""
    return BENCHMARK_SCENARIOS


@router.post("/run", response_model=BenchmarkSuiteReport)
async def run_benchmark_suite():
    """
    Execute full comparative benchmark suite across:
    - Baseline A (Static SOAR)
    - Baseline B (Standard LLM Copilot)
    - AegisCore (Full Architecture)
    - Ablation 1 (No Graph)
    - Ablation 2 (No Gates)
    - Ablation 3 (No Verification)
    """
    global _latest_benchmark_report
    runner = BenchmarkRunner()
    report = runner.run_all()
    _latest_benchmark_report = report.model_dump()
    return report


@router.get("/latest", response_model=Dict[str, Any])
async def get_latest_benchmark_report():
    """Retrieve the latest cached benchmark suite execution report."""
    global _latest_benchmark_report
    if not _latest_benchmark_report:
        runner = BenchmarkRunner()
        report = runner.run_all()
        _latest_benchmark_report = report.model_dump()
    return _latest_benchmark_report


@router.get("/hypotheses")
async def get_hypotheses_validation():
    """Retrieve research hypothesis validation status (H1 through H6)."""
    global _latest_benchmark_report
    if not _latest_benchmark_report:
        runner = BenchmarkRunner()
        report = runner.run_all()
        _latest_benchmark_report = report.model_dump()
    return _latest_benchmark_report.get("hypotheses_validated", {})
