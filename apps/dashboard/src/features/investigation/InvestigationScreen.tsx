import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ScoreDimensions } from '@/components/safety/ScoreDimensions';
import { Claim } from '@/components/safety/Claim';
import { UntrustedContent } from '@/components/safety/UntrustedContent';
import { FourStateBadge } from '@/components/safety/FourStateBadge';
import { DiscrepancyViewer } from '@/components/safety/DiscrepancyViewer';
import { ActionTierBadge } from '@/components/safety/ActionTierBadge';
import {
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileSearch,
  SlidersHorizontal,
  Bot,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const InvestigationScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const incidentId = id || 'INC-2026-8841';

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => apiClient.getIncidentById(incidentId),
  });

  const [activeTab, setActiveTab] = useState<'evidence' | 'timeline' | 'unknowns' | 'agents' | 'verification'>('evidence');
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-mono text-sm animate-pulse">
        Retrieving Incident Provenance Dossier & Validating State Graph...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Incident Not Found</h2>
        <p className="text-xs text-slate-400 font-mono">No record with ID {incidentId} exists.</p>
        <Link to="/" className="text-xs text-indigo-400 underline">Return to SOC Overview</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to SOC Overview</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Tenant Boundary:</span>
          <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-700/40 px-2 py-0.5 rounded">
            {incident.tenant_id}
          </span>
        </div>
      </div>

      {/* Incident Header Dossier */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded">
                {incident.id}
              </span>
              <span
                className={cn(
                  "text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase",
                  incident.severity === 'CRITICAL' && "text-rose-400 bg-rose-500/10 border-rose-500/40",
                  incident.severity === 'HIGH' && "text-orange-400 bg-orange-500/10 border-orange-500/40",
                  incident.severity === 'MEDIUM' && "text-amber-400 bg-amber-500/10 border-amber-500/40",
                  incident.severity === 'LOW' && "text-sky-400 bg-sky-500/10 border-sky-500/40"
                )}
              >
                {incident.severity}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                STATUS: {incident.status}
              </span>
              {incident.verified_state && (
                <FourStateBadge state={incident.verified_state.state} showWarningNotice={incident.verified_state.state === 'unknown'} />
              )}
            </div>

            {/* Non-Negotiable Cautious Title */}
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight mt-1">
              {incident.title}
            </h1>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2">
            <Link
              to="/response"
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-950"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Response Proposals & Approval</span>
            </Link>
          </div>
        </div>

        {/* 5-Dimensional Scores (NEVER Collapsed) */}
        <ScoreDimensions scores={incident.scores} />
      </div>

      {/* Discrepancy Notification if Detected */}
      {incident.verified_state?.discrepancy_detected && (
        <div className="p-4 rounded-xl bg-amber-950/40 border-2 border-amber-500/60 text-amber-200 text-xs flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-300 text-sm font-bold block">
              Containment Verification Discrepancy Active
            </strong>
            <p className="leading-relaxed">
              {incident.verified_state.discrepancy_notes}
            </p>
          </div>
        </div>
      )}

      {/* Investigative Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('evidence')}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === 'evidence'
              ? "border-indigo-500 text-indigo-300 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <FileSearch className="w-4 h-4" />
          <span>Evidence Cards ({incident.evidence.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === 'timeline'
              ? "border-indigo-500 text-indigo-300 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Timeline & Provenance Claims ({incident.claims.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('unknowns')}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === 'unknowns'
              ? "border-indigo-500 text-indigo-300 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span>Contradictions & Unknowns</span>
          {(incident.contradictions_and_unknowns.contradictions.length > 0 ||
            incident.contradictions_and_unknowns.data_gaps.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-purple-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === 'agents'
              ? "border-indigo-500 text-indigo-300 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Bot className="w-4 h-4" />
          <span>Multi-Agent Traces</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === 'verification'
              ? "border-indigo-500 text-indigo-300 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Command vs. Verified State</span>
        </button>
      </div>

      {/* Tab 1: Evidence Cards & Untrusted Telemetry */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span>
              All incoming telemetry is sanitized and mapped to OCSF Pydantic models. Raw payloads are rendered inertly without HTML or script execution.
            </span>
            <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              PROMPT INJECTION DEFENSE ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {incident.evidence.map((ev) => (
              <div
                key={ev.id}
                id={`evidence-${ev.event_id}`}
                className={cn(
                  "p-5 rounded-xl border transition-all",
                  highlightedEventId === ev.event_id
                    ? "bg-indigo-950/30 border-indigo-500 shadow-lg shadow-indigo-950"
                    : "bg-slate-900/80 border-slate-800"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-200">{ev.source_product}</span>
                    <span className="font-mono text-[11px] text-slate-400">ID: {ev.event_id}</span>
                    {ev.is_corroborating && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                        <CheckCircle className="w-2.5 h-2.5" /> CORROBORATING
                      </span>
                    )}
                    {ev.is_contradicting && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">
                        <XCircle className="w-2.5 h-2.5" /> CONTRADICTING
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Observed: {new Date(ev.observed_at).toLocaleTimeString()} ({ev.freshness_minutes}m fresh)
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-3">{ev.summary}</p>

                {/* Key Extracted Fields */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {Object.entries(ev.fields).map(([k, v]) => (
                    <div key={k} className="p-2 rounded bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono">
                      <span className="text-slate-400 block text-[10px] uppercase">{k}</span>
                      <span className="text-slate-200 truncate block">{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Plain-text Untrusted Payload Inspector (Protects against Prompt Injection) */}
                <UntrustedContent
                  content={ev.raw_payload}
                  sourceLabel={`${ev.source_product} :: raw_event_ref`}
                  maxLines={8}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Timeline with Mandatory Provenance Claims */}
      {activeTab === 'timeline' && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Every analytical claim is strictly anchored to telemetry or marked as an Inference.</span>
            <span className="font-mono text-[11px] text-sky-400">100% Claims Audited</span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {incident.claims.map((claim) => (
              <div key={claim.id} className="relative space-y-2">
                <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-900" />
                <div className="flex flex-col gap-1.5">
                  <Claim
                    text={claim.text}
                    isInference={claim.is_inference}
                    sourceRef={claim.source_ref}
                    onViewEvidence={(evtId) => {
                      setHighlightedEventId(evtId);
                      setActiveTab('evidence');
                    }}
                  />
                  {claim.is_inference && (
                    <p className="text-[11px] text-amber-300/80 font-mono pl-2">
                      ⚠️ Note: Analytical hypothesis generated by Investigator agent. Awaiting direct telemetry verification.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Contradictions & Unknowns (First-Class Uncertainty) */}
      {activeTab === 'unknowns' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Contradictions */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <XCircle className="w-4 h-4" />
              <span>Evidence Contradictions</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Findings that actively conflict with a malicious explanation or hypothesis.
            </p>
            <div className="space-y-2">
              {incident.contradictions_and_unknowns.contradictions.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 text-xs text-rose-200 leading-relaxed">
                  {c}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Data Gaps */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Telemetry Data Gaps</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Missing logs, eventual consistency delays, or dropped telemetry packets.
            </p>
            <div className="space-y-2">
              {incident.contradictions_and_unknowns.data_gaps.map((g, i) => (
                <div key={i} className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 leading-relaxed">
                  {g}
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Unverified Assumptions */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Unverified Assumptions</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Model assumptions that must be validated before taking irreversible action.
            </p>
            <div className="space-y-2">
              {incident.contradictions_and_unknowns.unverified_assumptions.map((a, i) => (
                <div key={i} className="p-3 rounded-lg bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200 leading-relaxed">
                  {a}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Multi-Agent Deliberation Trace */}
      {activeTab === 'agents' && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="text-xs text-slate-400">
            Execution trace of specialized agents with bounded query scopes and explicit uncertainty logging.
          </div>
          <div className="space-y-3">
            {incident.agent_traces.map((trace, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30">
                      {trace.agent}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{trace.observation}</p>
                {trace.uncertainty_notes && (
                  <p className="text-[11px] font-mono text-purple-300 bg-purple-950/30 border border-purple-800/40 p-2 rounded mt-1">
                    🔍 Residual Uncertainty: {trace.uncertainty_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Verification & Discrepancy Viewer */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <DiscrepancyViewer
            commandStatus={incident.command_status}
            verifiedState={incident.verified_state}
          />
          {incident.selected_action && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400">Target Action Profile:</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{incident.selected_action.name}</span>
                <ActionTierBadge tier={incident.selected_action.tier} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
