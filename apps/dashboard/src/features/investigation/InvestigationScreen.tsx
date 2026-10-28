import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ScoreDimensions } from '@/components/safety/ScoreDimensions';
import { Claim } from '@/components/safety/Claim';
import { UntrustedContent } from '@/components/safety/UntrustedContent';
import { FourStateBadge } from '@/components/safety/FourStateBadge';
import { DiscrepancyViewer } from '@/components/safety/DiscrepancyViewer';
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
  ArrowRight
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
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm animate-pulse">
        Retrieving Incident Dossier...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <h2 className="text-base font-bold text-white">Incident Not Found</h2>
        <p className="text-xs text-slate-400">No record with ID {incidentId} exists.</p>
        <Link to="/" className="text-xs text-indigo-400 underline">Return to Overview</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto font-sans">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </Link>
        <span className="text-xs text-slate-400">
          Tenant: <span className="text-slate-300 font-medium">{incident.tenant_id}</span>
        </span>
      </div>

      {/* Incident Header Card */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                {incident.id}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded uppercase",
                  incident.severity === 'CRITICAL' && "text-rose-400 bg-rose-500/10",
                  incident.severity === 'HIGH' && "text-orange-400 bg-orange-500/10",
                  incident.severity === 'MEDIUM' && "text-amber-400 bg-amber-500/10",
                  incident.severity === 'LOW' && "text-sky-400 bg-sky-500/10"
                )}
              >
                {incident.severity}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {incident.status}
              </span>
              {incident.verified_state && (
                <FourStateBadge state={incident.verified_state.state} showWarningNotice={incident.verified_state.state === 'unknown'} />
              )}
            </div>

            <h1 className="text-lg font-bold text-white tracking-tight">
              {incident.title}
            </h1>
          </div>

          <Link
            to="/response"
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors self-start md:self-auto flex-shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Response & Approvals</span>
          </Link>
        </div>

        {/* 5D Score Matrix */}
        <ScoreDimensions scores={incident.scores} />
      </div>

      {/* Discrepancy Banner */}
      {incident.verified_state?.discrepancy_detected && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
          <AlertOctagon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-300 font-semibold block">
              Containment Verification Discrepancy Active
            </strong>
            <p className="leading-relaxed">
              {incident.verified_state.discrepancy_notes || incident.verified_state.details}
            </p>
          </div>
        </div>
      )}

      {/* Clean Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('evidence')}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === 'evidence'
              ? "border-indigo-500 text-indigo-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <FileSearch className="w-3.5 h-3.5" />
          <span>Evidence ({incident.evidence.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === 'timeline'
              ? "border-indigo-500 text-indigo-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Claims & Provenance ({incident.claims.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('unknowns')}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === 'unknowns'
              ? "border-indigo-500 text-indigo-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Unknowns</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === 'agents'
              ? "border-indigo-500 text-indigo-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent Traces</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === 'verification'
              ? "border-indigo-500 text-indigo-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Verification State</span>
        </button>
      </div>

      {/* Tab 1: Evidence */}
      {activeTab === 'evidence' && (
        <div className="space-y-3">
          {incident.evidence.map((ev) => (
            <div key={ev.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{ev.source_product}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{ev.event_id}</span>
                  {ev.is_corroborating && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                      Corroborating
                    </span>
                  )}
                  {ev.is_contradicting && (
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-medium">
                      Contradicting
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Observed {new Date(ev.observed_at).toLocaleTimeString()}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{ev.summary}</p>

              {ev.raw_payload && (
                <div className="mt-2">
                  <UntrustedContent content={ev.raw_payload} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Timeline Claims */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {incident.claims.map((claim) => (
            <Claim key={claim.id} claim={claim} onInspectSource={(evtId) => {
              setHighlightedEventId(evtId);
              setActiveTab('evidence');
            }} />
          ))}
        </div>
      )}

      {/* Tab 3: Unknowns */}
      {activeTab === 'unknowns' && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-purple-300">Data Gaps & Unknowns</h3>
            {incident.contradictions_and_unknowns.data_gaps.length > 0 ? (
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {incident.contradictions_and_unknowns.data_gaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">Zero active data gaps identified.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Agent Traces */}
      {activeTab === 'agents' && (
        <div className="space-y-3">
          {incident.agent_traces.map((trace, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-indigo-400">Agent: {trace.agent}</span>
                <span className="text-[11px]">{new Date(trace.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-300">{trace.observation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Verification State */}
      {activeTab === 'verification' && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
          {incident.verified_state ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Closed-Loop Verdict</span>
                <FourStateBadge state={incident.verified_state.state} />
              </div>
              <p className="text-slate-300">{incident.verified_state.details}</p>
            </div>
          ) : (
            <p className="text-slate-400">Awaiting remediation execution to initiate verification loop.</p>
          )}
        </div>
      )}
    </div>
  );
};
