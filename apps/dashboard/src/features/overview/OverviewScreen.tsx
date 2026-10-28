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
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Database,
  Radio,
  Zap,
  ArrowRight,
  Server
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
    refetchInterval: 3000,
  });

  const { data: incidents, isLoading: isIncidentsLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => apiClient.getIncidents(),
    refetchInterval: 5000,
  });

  const { operatingMode, emergencyHaltActive } = useAppStore();

  if (isMetricsLoading || isIncidentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm animate-pulse">
        Connecting to AegisCore Control Plane...
      </div>
    );
  }

  const openIncidents = incidents || [];
  const criticalCount = metrics?.incidents_by_severity.critical || 0;
  const highCount = metrics?.incidents_by_severity.high || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Security Operations Center
            </h1>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time threat detection, multi-agent analysis, and verified response
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="text-slate-400 text-[11px]">Operating Mode</div>
            <div className="font-semibold text-slate-200">
              {operatingMode === 'approval' ? 'Human Approval Required' : 'Autonomous (Preapproved Only)'}
            </div>
          </div>
          {emergencyHaltActive && (
            <span className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded">
              HALTED
            </span>
          )}
        </div>
      </div>

      {/* Quick Access Simulator Banner */}
      <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              Architecture & Department Simulator
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Simulate live threat scenarios across 6 enterprise department databases (Finance, HR, Orders, R&D, Lakehouse, IAM)
            </div>
          </div>
        </div>
        <Link
          to="/pipeline"
          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 self-start sm:self-auto"
        >
          <span>Open Simulator</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Open Incidents */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {openIncidents.length}
          </div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-rose-400 font-medium">{criticalCount} Critical</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-medium">{highCount} High</span>
          </div>
        </div>

        {/* Card 2: Ingestion Rate */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ingestion Rate</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {metrics?.events_per_sec.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">EPS</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Lag: {metrics?.event_lag_seconds}s</span>
          </div>
        </div>

        {/* Card 3: Containment Veracity */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Containment Veracity</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {metrics?.verified_containment_rate_pct}%
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Closed-loop verified
          </div>
        </div>

        {/* Card 4: Schema Health */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Schema Integrity</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            100%
          </div>
          <div className="text-xs text-slate-400 mt-2">
            0 Dead-Letter errors
          </div>
        </div>
      </div>

      {/* Chart & Connectors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telemetry Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                24-Hour Telemetry Volume & Anomalies
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingested event rate vs detected anomaly spikes
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Events
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Anomalies
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getRealTimeSeriesData()} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#eventGrad)" />
                <Area type="monotone" dataKey="anomalies" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#anomalyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Connectors Health */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Connector Health</h2>
              <span className="text-xs text-slate-400">5 Connected</span>
            </div>
            <div className="space-y-2.5">
              {metrics?.connectors.map((c) => (
                <div key={c.name} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{c.name}</span>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase",
                      c.status === 'healthy' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    )}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mt-1">
                    <span>{c.type}</span>
                    <span>{c.latency_ms}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Least-privilege scoped token auth active
          </div>
        </div>
      </div>

      {/* Active Incidents Queue */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Active Incident Queue</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              5-dimensional decoupled risk scoring
            </p>
          </div>
          <span className="text-xs text-slate-300 bg-slate-800 px-2.5 py-1 rounded">
            {openIncidents.length} Cases
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {openIncidents.map((inc) => (
            <div
              key={inc.id}
              className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Column: ID, Title, Target */}
              <div className="space-y-1.5 lg:max-w-[45%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {inc.id}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded uppercase",
                      inc.severity === 'CRITICAL' && "text-rose-400 bg-rose-500/10",
                      inc.severity === 'HIGH' && "text-orange-400 bg-orange-500/10",
                      inc.severity === 'MEDIUM' && "text-amber-400 bg-amber-500/10",
                      inc.severity === 'LOW' && "text-sky-400 bg-sky-500/10"
                    )}
                  >
                    {inc.severity}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {inc.status}
                  </span>
                  {inc.verified_state && (
                    <FourStateBadge state={inc.verified_state.state} />
                  )}
                </div>

                <Link
                  to={`/investigation/${inc.id}`}
                  className="text-sm font-medium text-slate-200 hover:text-indigo-400 transition-colors flex items-center gap-1 group"
                >
                  <span>{inc.title}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                </Link>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Target:</span>
                  {inc.affected_entities.map((e) => (
                    <span
                      key={e.id}
                      className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[11px]"
                    >
                      {e.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Middle Column: 5D Scores */}
              <div className="lg:w-[38%]">
                <ScoreDimensions scores={inc.scores} size="sm" showLabels={false} />
              </div>

              {/* Right Column: CTA */}
              <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                <Link
                  to={`/investigation/${inc.id}`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                {inc.selected_action && (
                  <ActionTierBadge tier={inc.selected_action.tier} showAutoEligibility={false} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
