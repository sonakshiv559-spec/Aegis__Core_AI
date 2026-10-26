export type VerificationState = 'success' | 'partial' | 'failure' | 'unknown';

export type ActionTier = 0 | 1 | 2 | 3;

export interface ScoreDimensions {
  anomaly_score: number;       // 0.0 - 1.0 (How unusual)
  threat_confidence: number;   // 0.0 - 1.0 (Malicious probability)
  business_impact: number;     // 0.0 - 1.0 (Criticality & blast radius)
  action_risk: number;         // 0.0 - 1.0 (Risk/irreversibility of fix)
  evidence_sufficiency: number;// 0.0 - 1.0 (Completeness of proof)
}

export interface SourceProvenance {
  event_id: string;
  source_product: string;
  time_observed: string;
  raw_event_ref?: string;
}

export interface ClaimItem {
  id: string;
  text: string;
  is_inference: boolean;
  source_ref?: SourceProvenance;
}

export interface EvidenceItem {
  id: string;
  type: 'idp' | 'edr' | 'cloud' | 'network' | 'application';
  source_product: string;
  event_id: string;
  observed_at: string;
  summary: string;
  is_corroborating: boolean;
  is_contradicting: boolean;
  freshness_minutes: number;
  raw_payload: string;         // Untrusted content
  is_untrusted: boolean;
  fields: Record<string, string | number | boolean>;
}

export interface AffectedEntity {
  id: string;
  name: string;
  type: 'user' | 'service_account' | 'endpoint' | 'cloud_resource' | 'database' | 'service';
  criticality: 'Tier 1' | 'Tier 2' | 'Tier 3';
  owner?: string;
}

export interface CandidateAction {
  action_id: string;
  action_type: string;
  name: string;
  tier: ActionTier;
  target_entity_id: string;
  target_entity_name: string;
  target_entity_type: string;
  predicted_blast_radius: string[];
  reversibility_score: number;  // 0.0 to 1.0
  required_evidence_predicates: string[];
  security_gain: number;
  business_disruption_cost: number;
  parameters: Record<string, any>;
  policy_version: string;
}

export interface AgentTrace {
  agent: 'Sentry' | 'Investigator' | 'Validator' | 'Planner' | 'Executor' | 'Verifier';
  timestamp: string;
  observation: string;
  uncertainty_notes?: string;
}

export interface IncidentRecord {
  id: string;
  tenant_id: string;
  title: string; // Cautious wording
  status: 'NEW' | 'INVESTIGATING' | 'PENDING_APPROVAL' | 'EXECUTING' | 'VERIFYING' | 'CONTAINED' | 'ESCALATED' | 'CLOSED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  created_at: string;
  updated_at: string;
  scores: ScoreDimensions;
  affected_entities: AffectedEntity[];
  claims: ClaimItem[];
  evidence: EvidenceItem[];
  candidate_actions: CandidateAction[];
  selected_action?: CandidateAction;
  contradictions_and_unknowns: {
    contradictions: string[];
    data_gaps: string[];
    unverified_assumptions: string[];
  };
  agent_traces: AgentTrace[];
  command_status?: {
    status_code: number;
    message: string;
    issued_at: string;
  };
  verified_state?: {
    state: VerificationState;
    verified_at: string;
    details: string;
    discrepancy_detected: boolean;
    discrepancy_notes?: string;
  };
  approval_contract?: {
    approver?: string;
    approver_role?: string;
    approved_at?: string;
    reason?: string;
    target_hash: string;
    parameters_hash: string;
    policy_version: string;
    expiry_timestamp: string;
    is_invalidated: boolean;
  };
}

export interface ConnectorHealth {
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency_ms: number;
  error_rate_pct: number;
  last_sync: string;
}

export interface TelemetryMetrics {
  events_per_sec: number;
  event_lag_seconds: number;
  unresolved_uncertainty_count: number;
  verified_containment_rate_pct: number;
  dead_letter_count: number;
  connectors: ConnectorHealth[];
  incidents_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
