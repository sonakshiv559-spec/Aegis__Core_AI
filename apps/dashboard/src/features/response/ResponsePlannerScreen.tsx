import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ActionTierBadge } from '@/components/safety/ActionTierBadge';
import { CandidateAction } from '@/types';
import { useAppStore } from '@/lib/store';
import {
  SlidersHorizontal,
  ShieldCheck,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { cn, formatPercent } from '@/lib/utils';

export const ResponsePlannerScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser, emergencyHaltActive } = useAppStore();

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', 'INC-2026-8841'],
    queryFn: () => apiClient.getIncidentById('INC-2026-8841'),
  });

  const [selectedActionForApproval, setSelectedActionForApproval] = useState<CandidateAction | null>(null);
  const [justification, setJustification] = useState('');
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: ({ incidentId, actionId, justification }: { incidentId: string; actionId: string; justification: string }) =>
      apiClient.approveAction(incidentId, actionId, currentUser.name, currentUser.role, justification),
    onSuccess: (updatedIncident) => {
      queryClient.setQueryData(['incident', updatedIncident.id], updatedIncident);
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setApprovalFeedback(`Action '${selectedActionForApproval?.name}' authorized and dispatched to connector. Verification loop initiated.`);
      setSelectedActionForApproval(null);
      setJustification('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ incidentId, actionId, reason }: { incidentId: string; actionId: string; reason: string }) =>
      apiClient.rejectAction(incidentId, actionId, currentUser.name, reason),
    onSuccess: (updatedIncident) => {
      queryClient.setQueryData(['incident', updatedIncident.id], updatedIncident);
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setApprovalFeedback(`Action rejected. Incident escalated for manual security review.`);
      setSelectedActionForApproval(null);
      setJustification('');
    },
  });

  if (isLoading || !incident) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-mono text-sm animate-pulse">
        Generating Candidate Containment Actions & Querying Policy Engine...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            <span>Response Planning & Exact-Scope Approval Queue</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Algorithmic containment action selection balancing security containment gain against business disruption
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Authenticated Approver:</span>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded">
            {currentUser.name} ({currentUser.role})
          </span>
        </div>
      </div>

      {/* Success / Feedback Toast */}
      {approvalFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{approvalFeedback}</span>
          </div>
          <button onClick={() => setApprovalFeedback(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Incident Target Context */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-indigo-400 font-bold">{incident.id}</span>
          <span className="font-medium text-slate-200">{incident.title}</span>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          Target: {incident.affected_entities.map((e) => `${e.name} (${e.criticality})`).join(', ')}
        </div>
      </div>

      {/* Candidate Action Comparison Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Ranked Candidate Actions (Evaluated by Policy Engine)
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {incident.candidate_actions.map((act) => {
            const isSelected = incident.selected_action?.action_id === act.action_id;
            return (
              <div
                key={act.action_id}
                className={cn(
                  "p-5 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4",
                  isSelected
                    ? "bg-slate-900/90 border-indigo-500 shadow-xl shadow-indigo-950/40"
                    : "bg-slate-900/60 border-slate-800"
                )}
              >
                {/* Action Details */}
                <div className="space-y-2 lg:max-w-[55%]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white tracking-tight">{act.name}</span>
                    <ActionTierBadge tier={act.tier} />
                    {isSelected && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold">
                        RECOMMENDED CANDIDATE
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 font-mono space-y-1">
                    <div>
                      Target Entity: <span className="text-slate-200">{act.target_entity_name}</span> ({act.target_entity_type})
                    </div>
                    <div>
                      Predicted Blast Radius:{' '}
                      {act.predicted_blast_radius.length > 0 ? (
                        <span className="text-amber-300">{act.predicted_blast_radius.join(', ')}</span>
                      ) : (
                        <span className="text-emerald-400">Zero dependent services disrupted</span>
                      )}
                    </div>
                    <div>
                      Required Evidence Predicates:{' '}
                      <span className="text-slate-300">{act.required_evidence_predicates.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Quantitative Trade-Off Metrics */}
                <div className="grid grid-cols-3 gap-3 text-center lg:w-[25%] font-mono text-xs">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Security Gain</span>
                    <span className="text-emerald-400 font-bold">{formatPercent(act.security_gain)}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Disruption</span>
                    <span className={cn(
                      "font-bold",
                      act.business_disruption_cost > 0.5 ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {formatPercent(act.business_disruption_cost)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Reversibility</span>
                    <span className="text-sky-400 font-bold">{formatPercent(act.reversibility_score)}</span>
                  </div>
                </div>

                {/* Approval Trigger */}
                <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                  <button
                    type="button"
                    onClick={() => setSelectedActionForApproval(act)}
                    disabled={emergencyHaltActive}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-950"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Review & Exact-Scope Authorize</span>
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Policy: {act.policy_version}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EXACT-SCOPE BOUND APPROVAL MODAL */}
      {selectedActionForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl p-6 bg-slate-900 border-2 border-indigo-500 rounded-xl shadow-2xl shadow-indigo-950/60 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedActionForApproval(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Cryptographically Bound Scope Authorization
                </h3>
                <p className="text-xs text-indigo-400 font-mono">
                  Exact Target & Parameter Locking Contract
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Exact Parameters Lock */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-slate-400 text-[11px] uppercase font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  Bound Scope Specifications
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Action ID:</span>
                    <span className="text-slate-200">{selectedActionForApproval.action_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Target Entity ID:</span>
                    <span className="text-slate-200">{selectedActionForApproval.target_entity_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Policy Version:</span>
                    <span className="text-slate-200">{selectedActionForApproval.policy_version}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Authorization Expiry:</span>
                    <span className="text-amber-400">30 minutes from approval</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-500 block mb-1">Locked Connector Parameters (JSON):</span>
                  <pre className="p-2 rounded bg-slate-900 text-[10px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedActionForApproval.parameters, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Invalidation Invariant Notice */}
              <div className="p-2.5 rounded bg-amber-950/30 border border-amber-600/40 text-amber-200 text-[11px] leading-relaxed">
                <strong>Safety Principle:</strong> Any subsequent deviation in target parameters, environment state,
                or policy version will visually and cryptographically invalidate this approval, immediately halting execution.
              </div>

              {/* Mandatory Reason Field */}
              <div className="font-sans space-y-1">
                <label className="block text-slate-300 text-xs font-medium">
                  Approval Reason / Operational Sign-off Justification (Mandatory):
                </label>
                <textarea
                  required
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="e.g., Containment authorized after verifying token exfiltration alerts. Reversible session revocation chosen to preserve batch ETL jobs."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    if (!justification.trim()) {
                      alert('A reason is mandatory for audit logging before rejecting.');
                      return;
                    }
                    rejectMutation.mutate({
                      incidentId: incident.id,
                      actionId: selectedActionForApproval.action_id,
                      reason: justification,
                    });
                  }}
                  className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject & Escalate</span>
                </button>

                <button
                  type="button"
                  disabled={!justification.trim() || approveMutation.isPending}
                  onClick={() => {
                    approveMutation.mutate({
                      incidentId: incident.id,
                      actionId: selectedActionForApproval.action_id,
                      justification,
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-950"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorize & Dispatch Connector</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
