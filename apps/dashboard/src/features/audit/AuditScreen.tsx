import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FourStateBadge } from '@/components/safety/FourStateBadge';
import { DiscrepancyViewer } from '@/components/safety/DiscrepancyViewer';
import { ShieldCheck, Download, Search } from 'lucide-react';

export const AuditScreen: React.FC = () => {
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => apiClient.getIncidents(),
  });

  const [searchFilter, setSearchFilter] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm animate-pulse">
        Verifying Closed-Loop Audit Records...
      </div>
    );
  }

  const exportAuditLog = () => {
    const jsonStr = JSON.stringify(incidents, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegiscore-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredIncidents = (incidents || []).filter(
    (inc) =>
      inc.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Closed-Loop Verification & Audit</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Independent ground-truth observation, discrepancy logs, and immutable action trail
          </p>
        </div>

        <button
          type="button"
          onClick={exportAuditLog}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export Audit Dossier (.JSON)</span>
        </button>
      </div>

      {/* Verification Checks Spotlight */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Active Postcondition Checks</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents
            ?.filter((inc) => inc.command_status || inc.verified_state)
            .map((inc) => (
              <div key={inc.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-400 font-semibold">{inc.id}</span>
                  {inc.verified_state && <FourStateBadge state={inc.verified_state.state} />}
                </div>

                <div className="text-xs text-white font-medium">{inc.title}</div>

                {inc.verified_state?.discrepancy_detected && (
                  <DiscrepancyViewer
                    commandStatus={inc.command_status}
                    verifiedState={inc.verified_state}
                  />
                )}

                {inc.verified_state && !inc.verified_state.discrepancy_detected && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs">
                    {inc.verified_state.details}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Immutable Incident Ledger */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white">Incident Audit Ledger</h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredIncidents.map((inc) => (
            <div key={inc.id} className="p-3.5 hover:bg-slate-800/30 transition-colors flex items-center justify-between text-xs">
              <div className="space-y-1 max-w-[60%]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-400 font-semibold">{inc.id}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">{inc.severity}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{inc.status}</span>
                </div>
                <div className="text-slate-200 truncate">{inc.title}</div>
              </div>

              <div className="text-right text-[11px] text-slate-400">
                <div>{new Date(inc.created_at).toLocaleDateString()}</div>
                <div className="text-slate-500 font-mono">{inc.tenant_id}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
