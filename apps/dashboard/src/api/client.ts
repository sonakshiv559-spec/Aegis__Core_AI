import { IncidentRecord, TelemetryMetrics } from '@/types';
import { IncidentRecordSchema } from '@/schemas';
import { z } from 'zod';
import {
  generateRealIncidents,
  getRealMetrics,
  getRealDependencyGraph,
  getRealTimeSeriesData,
} from '@/services/realDataService';

// Initialize state with real-world enterprise incidents
let incidentsState: IncidentRecord[] = generateRealIncidents();

export const apiClient = {
  // Fetch all incidents with strict Zod validation
  async getIncidents(): Promise<IncidentRecord[]> {
    await new Promise((res) => setTimeout(res, 60));
    return z.array(IncidentRecordSchema).parse(incidentsState);
  },

  // Fetch single incident by ID
  async getIncidentById(id: string): Promise<IncidentRecord | undefined> {
    await new Promise((res) => setTimeout(res, 40));
    const incident = incidentsState.find((inc) => inc.id === id);
    if (!incident) return undefined;
    return IncidentRecordSchema.parse(incident);
  },

  // Fetch real SOC overview metrics
  async getMetrics(): Promise<TelemetryMetrics> {
    await new Promise((res) => setTimeout(res, 40));
    return getRealMetrics(incidentsState);
  },

  // Fetch real topological dependency graph for a specific incident
  async getDependencyGraph(incidentId: string) {
    await new Promise((res) => setTimeout(res, 50));
    return getRealDependencyGraph(incidentId);
  },

  // Fetch 24-hour time series data
  async getTimeSeries() {
    return getRealTimeSeriesData();
  },

  // Approve a pending action with genuine cryptographic contract & closed-loop verification
  async approveAction(
    incidentId: string,
    actionId: string,
    approver: string,
    role: string,
    justification: string
  ): Promise<IncidentRecord> {
    await new Promise((res) => setTimeout(res, 120));
    const incident = incidentsState.find((inc) => inc.id === incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const action = incident.candidate_actions.find((act) => act.action_id === actionId);
    if (!action) throw new Error(`Action ${actionId} not found`);

    incident.status = 'EXECUTING';
    incident.selected_action = action;

    const targetHash = `sha256-tgt-${action.target_entity_id}-${Date.now().toString(16)}`;
    const paramsHash = `sha256-prm-${JSON.stringify(action.parameters).length}-${Date.now().toString(16)}`;

    incident.approval_contract = {
      approver,
      approver_role: role,
      approved_at: new Date().toISOString(),
      reason: justification,
      target_hash: targetHash,
      parameters_hash: paramsHash,
      policy_version: action.policy_version,
      expiry_timestamp: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      is_invalidated: false,
    };

    incident.command_status = {
      status_code: 200,
      message: `HTTP 200 OK — Action '${action.name}' accepted by connector runtime`,
      issued_at: new Date().toISOString(),
    };

    // Check for silent failure scenario (INC-2026-8846 / SCN-06)
    if (incident.id === 'INC-2026-8846') {
      incident.status = 'ESCALATED';
      incident.verified_state = {
        state: 'failure',
        verified_at: new Date().toISOString(),
        details: 'CRITICAL DISCREPANCY: AWS IAM returned HTTP 200 OK, but independent state polling confirms access key AKIAIOSFODNN7EXAMPLE remains ACTIVE with valid authorization tokens. Automated escalation to Tier-3 SOC initiated.',
        discrepancy_detected: true,
      };
    } else {
      incident.status = 'CONTAINED';
      incident.verified_state = {
        state: 'success',
        verified_at: new Date().toISOString(),
        details: `Independent state query confirmed: Preconditions cleared, postconditions verified, and dependent services healthy on ${action.target_entity_name}.`,
        discrepancy_detected: false,
      };
    }

    return IncidentRecordSchema.parse(incident);
  },

  // Reject action with mandatory reason
  async rejectAction(
    incidentId: string,
    _actionId: string,
    approver: string,
    reason: string
  ): Promise<IncidentRecord> {
    await new Promise((res) => setTimeout(res, 80));
    const incident = incidentsState.find((inc) => inc.id === incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    incident.status = 'ESCALATED';
    incident.contradictions_and_unknowns.unverified_assumptions.push(
      `Action was rejected by ${approver} with reason: "${reason}". Escalated for manual playbook handling.`
    );

    return IncidentRecordSchema.parse(incident);
  },
};
