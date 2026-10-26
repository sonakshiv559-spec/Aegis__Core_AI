import { z } from 'zod';

export const ScoreDimensionsSchema = z.object({
  anomaly_score: z.number().min(0).max(1),
  threat_confidence: z.number().min(0).max(1),
  business_impact: z.number().min(0).max(1),
  action_risk: z.number().min(0).max(1),
  evidence_sufficiency: z.number().min(0).max(1),
});

export const SourceProvenanceSchema = z.object({
  event_id: z.string(),
  source_product: z.string(),
  time_observed: z.string(),
  raw_event_ref: z.string().optional(),
});

export const ClaimItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  is_inference: z.boolean(),
  source_ref: SourceProvenanceSchema.optional(),
});

export const EvidenceItemSchema = z.object({
  id: z.string(),
  type: z.enum(['idp', 'edr', 'cloud', 'network', 'application']),
  source_product: z.string(),
  event_id: z.string(),
  observed_at: z.string(),
  summary: z.string(),
  is_corroborating: z.boolean(),
  is_contradicting: z.boolean(),
  freshness_minutes: z.number(),
  raw_payload: z.string(),
  is_untrusted: z.boolean(),
  fields: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

export const CandidateActionSchema = z.object({
  action_id: z.string(),
  action_type: z.string(),
  name: z.string(),
  tier: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  target_entity_id: z.string(),
  target_entity_name: z.string(),
  target_entity_type: z.string(),
  predicted_blast_radius: z.array(z.string()),
  reversibility_score: z.number().min(0).max(1),
  required_evidence_predicates: z.array(z.string()),
  security_gain: z.number(),
  business_disruption_cost: z.number(),
  parameters: z.record(z.any()),
  policy_version: z.string(),
});

export const IncidentRecordSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  title: z.string(),
  status: z.enum([
    'NEW',
    'INVESTIGATING',
    'PENDING_APPROVAL',
    'EXECUTING',
    'VERIFYING',
    'CONTAINED',
    'ESCALATED',
    'CLOSED',
  ]),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  created_at: z.string(),
  updated_at: z.string(),
  scores: ScoreDimensionsSchema,
  affected_entities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['user', 'service_account', 'endpoint', 'cloud_resource', 'database', 'service']),
      criticality: z.enum(['Tier 1', 'Tier 2', 'Tier 3']),
      owner: z.string().optional(),
    })
  ),
  claims: z.array(ClaimItemSchema),
  evidence: z.array(EvidenceItemSchema),
  candidate_actions: z.array(CandidateActionSchema),
  selected_action: CandidateActionSchema.optional(),
  contradictions_and_unknowns: z.object({
    contradictions: z.array(z.string()),
    data_gaps: z.array(z.string()),
    unverified_assumptions: z.array(z.string()),
  }),
  agent_traces: z.array(
    z.object({
      agent: z.enum(['Sentry', 'Investigator', 'Validator', 'Planner', 'Executor', 'Verifier']),
      timestamp: z.string(),
      observation: z.string(),
      uncertainty_notes: z.string().optional(),
    })
  ),
  command_status: z
    .object({
      status_code: z.number(),
      message: z.string(),
      issued_at: z.string(),
    })
    .optional(),
  verified_state: z
    .object({
      state: z.enum(['success', 'partial', 'failure', 'unknown']),
      verified_at: z.string(),
      details: z.string(),
      discrepancy_detected: z.boolean(),
      discrepancy_notes: z.string().optional(),
    })
    .optional(),
  approval_contract: z
    .object({
      approver: z.string().optional(),
      approver_role: z.string().optional(),
      approved_at: z.string().optional(),
      reason: z.string().optional(),
      target_hash: z.string(),
      parameters_hash: z.string(),
      policy_version: z.string(),
      expiry_timestamp: z.string(),
      is_invalidated: z.boolean(),
    })
    .optional(),
});
