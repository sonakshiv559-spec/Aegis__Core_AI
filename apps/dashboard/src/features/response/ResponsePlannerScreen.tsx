import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ActionTierBadge } from '@/components/safety/ActionTierBadge';
import { CandidateAction } from '@/types';
import { useAppStore } from '@/lib/store';
import {
  SlidersHorizontal,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
  ShieldAlert
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
      setApprovalFeedback(`Action authorized. Verification loop initiated.`);
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
      setApprovalFeedback(`Action rejected. Escalated for manual review.`);
      setSelectedActionForApproval(null);
      setJustification('');
    },
  });

  if (isLoading || !incident) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm animate-pulse">
        Generating Candidate Containment Actions...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            <span>Response Proposals & Approval</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare candidate actions ranked by blast radius disruption vs security gain
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Target: <span className="font-mono text-indigo-400">{incident.id}</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {approvalFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{approvalFeedback}</span>
          </div>
          <button onClick={() => setApprovalFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Candidate Actions Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white">Candidate Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incident.candidate_actions.map((action, idx) => {
            const isRank1 = idx === 0;

            return (
              <div
                key={action.action_id}
                className={cn(
                  "p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all",
                  isRank1
                    ? "bg-slate-900/90 border-indigo-500/80 ring-1 ring-indigo-500/30 shadow-md"
                    : "bg-slate-900/40 border-slate-800"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded uppercase",
                      isRank1 ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400"
                    )}>
                      {isRank1 ? 'Recommended (Rank #1)' : `Alternative (Rank #${idx + 1})`}
                    </span>
                    <ActionTierBadge tier={action.tier} />
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">
                    {action.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs my-3">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Security Gain</span>
                      <span className="font-semibold text-emerald-400">{formatPercent(action.security_gain)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Disruption Cost</span>
                      <span className={cn("font-semibold", action.business_disruption_cost > 0.5 ? "text-rose-400" : "text-emerald-400")}>
                        {formatPercent(action.business_disruption_cost)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Target: <span className="text-slate-200">{action.target_entity_name}</span></div>
                    <div>Blast Radius: <span className="text-slate-200">{action.predicted_blast_radius.join(', ') || 'Target Isolated Only'}</span></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {action.action_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedActionForApproval(action)}
                    disabled={emergencyHaltActive}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Authorize</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval Modal */}
      {selectedActionForApproval && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-400" />
                <span>Sign Approval Contract</span>
              </h3>
              <button onClick={() => setSelectedActionForApproval(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-slate-300 font-semibold">{selectedActionForApproval.name}</div>
              <div className="text-slate-400">Target: {selectedActionForApproval.target_entity_name}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Justification / Reason</label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Enter mandatory authorization rationale..."
                rows={3}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedActionForApproval(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  approveMutation.mutate({
                    incidentId: incident.id,
                    actionId: selectedActionForApproval.action_id,
                    justification: justification || 'Authorized by SOC lead',
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Sign & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
