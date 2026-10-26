import { mockIncidents } from '@/mocks/incidents.mock';
import { mockMetrics } from '@/mocks/metrics.mock';
import { initialGraphNodes, initialGraphEdges } from '@/mocks/graph.mock';
import { IncidentRecord, TelemetryMetrics } from '@/types';
import { IncidentRecordSchema } from '@/schemas';
import { z } from 'zod';

// Local in-memory state copy for interactive modifications
let incidentsState: IncidentRecord[] = JSON.parse(JSON.stringify(mockIncidents));

export const apiClient = {
  // Fetch all incidents with strict Zod validation at the mock boundary
  async getIncidents(): Promise<IncidentRecord[]> {
    await new Promise((res) => setTimeout(res, 80)); // Simulate async network hop
    const validated = z.array(IncidentRecordSchema).parse(incidentsState);
    return validated;
  },

  // Fetch single incident by ID
  async getIncidentById(id: string): Promise<IncidentRecord | undefined> {
    await new Promise((res) => setTimeout(res, 60));
    const incident = incidentsState.find((inc) => inc.id === id);
    if (!incident) return undefined;
    return IncidentRecordSchema.parse(incident);
  },

  // Fetch SOC overview metrics
  async getMetrics(): Promise<TelemetryMetrics> {
    await new Promise((res) => setTimeout(res, 50));
    return mockMetrics;
  },

  // Fetch topological dependency graph for an incident
  async getDependencyGraph(_incidentId: string) {
    await new Promise((res) => setTimeout(res, 60));
    return {
      nodes: initialGraphNodes,
      edges: initialGraphEdges,
    };
  },

  // Approve a pending action with exact scope validation & justification
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
    incident.approval_contract = {
      approver,
      approver_role: role,
      approved_at: new Date().toISOString(),
      reason: justification,
      target_hash: `sha256-target-${action.target_entity_id}`,
      parameters_hash: `sha256-params-${JSON.stringify(action.parameters).length}`,
      policy_version: action.policy_version,
      expiry_timestamp: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      is_invalidated: false,
    };

    incident.command_status = {
      status_code: 200,
      message: `HTTP 200 OK — Action '${action.name}' accepted by connector runtime`,
      issued_at: new Date().toISOString(),
    };

    incident.verified_state = {
      state: 'success',
      verified_at: new Date(Date.now() + 5000).toISOString(),
      details: `Independent query confirmed: Preconditions cleared and postconditions satisfied on ${action.target_entity_name}.`,
      discrepancy_detected: false,
    };

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
