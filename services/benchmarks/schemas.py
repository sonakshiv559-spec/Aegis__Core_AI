"""
Benchmark Schema & Data Models for Phase 9
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SystemConfiguration(str, Enum):
    BASELINE_A_SOAR = "baseline_a_soar"                     # Static playbooks, no graph, blind isolation
    BASELINE_B_LLM = "baseline_b_llm"                       # Pure LLM confidence threshold, no deterministic gates
    AEGIS_FULL = "aegis_full"                               # Graph-aware + Evidence gates + Closed-loop verification
    ABLATION_1_NO_GRAPH = "ablation_1_no_graph"             # Aegis without Dependency Graph (blind containment)
    ABLATION_2_NO_GATES = "ablation_2_no_gates"             # Aegis without Evidence Gates (pure LLM threshold)
    ABLATION_3_NO_VERIFICATION = "ablation_3_no_verification" # Aegis without Closed-Loop Verification (trusts 200 OK)


class AttackType(str, Enum):
    CREDENTIAL_STUFFING = "credential_stuffing"
    BENIGN_ANOMALOUS_MFA = "benign_anomalous_mfa"
    LATERAL_MOVEMENT = "lateral_movement"
    PROMPT_INJECTION = "prompt_injection"
    CLOUD_EXPOSURE = "cloud_exposure"
    SILENT_API_FAILURE = "silent_api_failure"
    RANSOMWARE_PROPAGATION = "ransomware_propagation"


class BenchmarkScenario(BaseModel):
    scenario_id: str
    title: str
    attack_type: AttackType
    description: str
    initial_telemetry: Dict[str, Any]
    target_entity: str
    critical_dependencies: List[str] = Field(default_factory=list)
    has_silent_failure: bool = False
    has_prompt_injection: bool = False
    injected_payload: Optional[str] = None
    ground_truth_threat_active: bool = True
    ground_truth_benign: bool = False


class ScenarioExecutionResult(BaseModel):
    scenario_id: str
    config: SystemConfiguration
    action_taken: str
    action_authorized: bool
    business_disruption_score: float
    containment_successful: bool
    unsafe_action_executed: bool
    prompt_injection_compromised: bool
    silent_failure_detected: bool
    evidence_traceability_pct: float
    mttd_ms: float
    mttr_ms: float
    details: str


class EvaluationMetrics(BaseModel):
    config: SystemConfiguration
    total_scenarios: int
    unsafe_action_rate: float
    total_business_disruption: float
    avg_business_disruption: float
    containment_success_rate: float
    verification_catch_rate: float
    evidence_traceability_pct: float
    avg_mttd_ms: float
    avg_mttr_ms: float


class BenchmarkSuiteReport(BaseModel):
    timestamp: str
    scenarios_evaluated: int
    metrics_by_configuration: Dict[str, EvaluationMetrics]
    comparative_summary: Dict[str, Any]
    hypotheses_validated: Dict[str, bool]
