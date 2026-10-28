"""
AegisCore AI - Benchmark & Ablation Evaluation Suite (Phase 9)
Evaluates AegisCore against Baseline A (Static SOAR), Baseline B (LLM Copilot),
and Ablations 1-3 across 7 real-world attack and operational disruption scenarios.
"""

from .schemas import BenchmarkScenario, BenchmarkResult, SystemConfiguration, EvaluationMetrics
from .runner import BenchmarkRunner

__all__ = [
    "BenchmarkScenario",
    "BenchmarkResult",
    "SystemConfiguration",
    "EvaluationMetrics",
    "BenchmarkRunner"
]
