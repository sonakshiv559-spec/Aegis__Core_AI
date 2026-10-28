import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ScoreDimensions } from '@/components/safety/ScoreDimensions';
import { FourStateBadge } from '@/components/safety/FourStateBadge';
import { ActionTierBadge } from '@/components/safety/ActionTierBadge';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Database,
  Radio,
  AlertTriangle,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { getRealTimeSeriesData } from '@/services/realDataService';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export const OverviewScreen: React.FC = () => {
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiClient.getMetrics(),
  });

  const { data: incidents, isLoading: isIncidentsLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => apiClient.getIncidents(),
  });

  const { operatingMode, emergencyHaltActive } = useAppStore();

  if (isMetricsLoading || isIncidentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-mono text-sm animate-pulse">
        Connecting to AegisCore Control Plane & Verifying OCSF Schemas...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>SOC Overview & Real-Time Threat Posture</span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE TELEMETRY
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-mono mt-0.5">
            Cross-tenant OCSF ingestion stream, multi-agent uncertainty monitor, and verified containment tracker
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right text-xs font-mono">
            <div className="text-slate-300 text-[10px] uppercase">Active Control Policy</div>
            <div className="font-semibold text-slate-200">
              {operatingMode === 'approval' ? 'Approval Mode (Human Required)' : 'Automatic Mode (Preapproved Low-Risk)'}
            </div>
          </div>
          {emergencyHaltActive && (
            <span className="px-2 py-1 bg-rose-600 text-white font-mono text-xs font-bold rounded animate-pulse">
              KILL SWITCH HALTED
            </span>
          )}
        </div>
      </div>

      {/* Interactive Enterprise Architecture Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-indigo-950/30">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-400">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                Enterprise Multi-Department Pipeline & Attack Simulator
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                6 Databases Connected
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Simulate live threat vectors across Finance, HR, E-Commerce, R&D, Data Lake, and IAM databases to inspect the 7-stage AegisCore response.
            </p>
          </div>
        </div>
        <Link
          to="/pipeline"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-950 flex-shrink-0"
        >
          <span>Launch Interactive Simulator</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Open Incidents by Severity */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Active Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-white">
              {(metrics?.incidents_by_severity.critical || 0) +
                (metrics?.incidents_by_severity.high || 0) +
                (metrics?.incidents_by_severity.medium || 0) +
                (metrics?.incidents_by_severity.low || 0)}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono mt-1">
              <span className="text-rose-400 bg-rose-950/40 px-1 rounded border border-rose-800">
                {metrics?.incidents_by_severity.critical} Crit
              </span>
              <span className="text-orange-400 bg-orange-950/40 px-1 rounded border border-orange-800">
                {metrics?.incidents_by_severity.high} High
              </span>
              <span className="text-amber-400 bg-amber-950/40 px-1 rounded border border-amber-800">
                {metrics?.incidents_by_severity.medium} Med
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-300 font-mono">OCSF correlated incident clusters</span>
        </div>

        {/* Card 2: Unresolved Uncertainty */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Unresolved Uncertainty</span>
            <HelpCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-purple-300">
              {metrics?.unresolved_uncertainty_count} Incidents
            </div>
            <p className="text-[11px] text-purple-200 mt-1">
              Telemetry contradictions or data gaps present
            </p>
          </div>
          <span className="text-[10px] text-slate-300 font-mono">Explicit uncertainty tracking active</span>
        </div>

        {/* Card 3: Verified Containment Rate */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Verified Containment</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {metrics?.verified_containment_rate_pct}%
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Independently verified postconditions
            </p>
          </div>
          <span className="text-[10px] text-slate-300 font-mono">Excludes simple API acknowledgments</span>
        </div>

        {/* Card 4: Event Lag & Telemetry Velocity */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Ingestion Pipeline</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-sky-300">
              {metrics?.events_per_sec.toLocaleString()} <span className="text-xs text-slate-400">eps</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Event Lag: {metrics?.event_lag_seconds}s</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-300 font-mono">Kafka/Vector buffer nominal</span>
        </div>

        {/* Card 5: Dead-Letter Queue */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Schema Integrity</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-indigo-300">
              {metrics?.dead_letter_count} Errors
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Zero unparseable OCSF payloads
            </p>
          </div>
          <span className="text-[10px] text-slate-300 font-mono">100% schema validation compliance</span>
        </div>
      </div>

      {/* Real-time Ingestion Stream & Ingestion Anomaly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 24-Hour Telemetry Volume Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Telemetry Volume & Statistical Anomaly Trend
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                Continuous Sentry feature extraction vs confirmed verified actions
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Events (eps)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Anomalies
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getRealTimeSeriesData()} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="events" stroke="#6366f1" fillOpacity={1} fill="url(#eventGrad)" />
                <Area type="monotone" dataKey="anomalies" stroke="#ef4444" fillOpacity={1} fill="url(#anomalyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Telemetry Source Connector Status */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Connector Health
              </h2>
              <span className="text-[10px] font-mono text-slate-300">Live Heartbeats</span>
            </div>
            <div className="space-y-3">
              {metrics?.connectors.map((c) => (
                <div key={c.name} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{c.name}</span>
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase",
                        c.status === 'healthy'
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                          : "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                      )}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mt-1">
                    <span>{c.type}</span>
                    <span>{c.latency_ms}ms latency</span>
                  </div>
                  {c.status === 'degraded' && (
                    <div className="mt-1 text-[10px] text-amber-400/90 font-mono flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      {c.last_sync}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
            All connectors operate under scoped token least-privilege credentials.
          </div>
        </div>
      </div>

      {/* Active Incidents Triage Queue */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Active Incident Triage Queue</h2>
            <p className="text-xs text-slate-300 font-mono">
              Evaluated with 5-dimensional decoupled scoring. Criticality never inflates confidence.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2.5 py-1 rounded">
            {incidents?.length || 0} Open Cases
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {incidents?.map((inc) => (
            <div
              key={inc.id}
              className="p-5 hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Column: ID, Title, Entities */}
              <div className="space-y-2 lg:max-w-[45%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded">
                    {inc.id}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase",
                      inc.severity === 'CRITICAL' && "text-rose-400 bg-rose-500/10 border-rose-500/40",
                      inc.severity === 'HIGH' && "text-orange-400 bg-orange-500/10 border-orange-500/40",
                      inc.severity === 'MEDIUM' && "text-amber-400 bg-amber-500/10 border-amber-500/40",
                      inc.severity === 'LOW' && "text-sky-400 bg-sky-500/10 border-sky-500/40"
                    )}
                  >
                    {inc.severity}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {inc.status}
                  </span>
                  {inc.verified_state && (
                    <FourStateBadge state={inc.verified_state.state} />
                  )}
                </div>

                <Link
                  to={`/investigation/${inc.id}`}
                  className="text-sm font-semibold text-slate-100 hover:text-indigo-400 transition-colors flex items-center gap-1 group leading-snug"
                >
                  <span>{inc.title}</span>
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                </Link>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono">
                  <span>Target:</span>
                  {inc.affected_entities.map((e) => (
                    <span
                      key={e.id}
                      className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[11px]"
                    >
                      {e.name} ({e.criticality})
                    </span>
                  ))}
                </div>
              </div>

              {/* Middle Column: 5-Dimensional Score Breakdown */}
              <div className="lg:w-[40%]">
                <ScoreDimensions scores={inc.scores} size="sm" />
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                <Link
                  to={`/investigation/${inc.id}`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-950"
                >
                  <span>Investigate Evidence</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                {inc.selected_action && (
                  <div className="mt-1">
                    <ActionTierBadge tier={inc.selected_action.tier} showAutoEligibility={false} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
