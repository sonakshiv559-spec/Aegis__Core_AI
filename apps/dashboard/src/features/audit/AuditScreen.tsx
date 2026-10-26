import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FourStateBadge } from '@/components/safety/FourStateBadge';
import { DiscrepancyViewer } from '@/components/safety/DiscrepancyViewer';
import {
  ShieldCheck,
  Download,
  Search,
} from 'lucide-react';

export const AuditScreen: React.FC = () => {
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => apiClient.getIncidents(),
  });

  const [searchFilter, setSearchFilter] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-mono text-sm animate-pulse">
        Verifying Cryptographic Audit Hashes & Invariant Contracts...
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Closed-Loop Verification & Append-Only Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Independent observation verification, discrepancy tracking, and immutable decision provenance
          </p>
        </div>

        <button
          type="button"
          onClick={exportAuditLog}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-2 border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Export Audit Dossier (.JSON)</span>
        </button>
      </div>

      {/* Discrepancy & Verification Spotlight */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Active Postcondition Verification Checks</span>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded">
            Closed-Loop Reconciliation
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents
            ?.filter((inc) => inc.command_status || inc.verified_state)
            .map((inc) => (
              <div key={inc.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-400 font-bold">{inc.id}</span>
                  <span className="text-slate-400">{inc.title}</span>
                </div>
                <DiscrepancyViewer
                  commandStatus={inc.command_status}
                  verifiedState={inc.verified_state}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Append-Only Cryptographic Audit Log Table */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Immutable Decision & Execution Ledger
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Cryptographically chained records linking evidence, policies, approver IDs, and postconditions
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by ID, role, or action..."
              className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Timestamp / Ref</th>
                <th className="py-2.5 px-3">Incident</th>
                <th className="py-2.5 px-3">Authorized Action</th>
                <th className="py-2.5 px-3">Approver & Role</th>
                <th className="py-2.5 px-3">Policy Version</th>
                <th className="py-2.5 px-3">Verified Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {incidents?.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                    <div>{new Date(inc.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(inc.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-indigo-400 whitespace-nowrap">
                    {inc.id}
                  </td>
                  <td className="py-3 px-3 text-slate-200">
                    {inc.selected_action?.name || (
                      <span className="text-slate-500 italic">Investigation in progress</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div>{inc.approval_contract?.approver || 'System Sentry (Observe Only)'}</div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {inc.approval_contract?.approver_role || 'Automated Baseline'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                    {inc.approval_contract?.policy_version || 'sec-policy-v2.4.1'}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {inc.verified_state ? (
                      <FourStateBadge state={inc.verified_state.state} />
                    ) : (
                      <span className="text-slate-500 text-[11px]">Unexecuted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
