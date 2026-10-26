import React from 'react';
import { VerificationState } from '@/types';
import { FourStateBadge } from './FourStateBadge';
import { cn } from '@/lib/utils';
import { AlertOctagon, CheckCheck, Terminal, Cpu } from 'lucide-react';

interface DiscrepancyViewerProps {
  commandStatus?: {
    status_code: number;
    message: string;
    issued_at: string;
  };
  verifiedState?: {
    state: VerificationState;
    verified_at: string;
    details: string;
    discrepancy_detected: boolean;
    discrepancy_notes?: string;
  };
  className?: string;
}

export const DiscrepancyViewer: React.FC<DiscrepancyViewerProps> = ({
  commandStatus,
  verifiedState,
  className,
}) => {
  if (!commandStatus && !verifiedState) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-900/40 border border-slate-800 rounded-md">
        No execution or postcondition records logged for this incident yet.
      </div>
    );
  }

  const hasDiscrepancy = verifiedState?.discrepancy_detected || 
    (commandStatus && commandStatus.status_code === 200 && verifiedState?.state !== 'success');

  return (
    <div className={cn("rounded-lg border overflow-hidden", hasDiscrepancy ? "border-amber-600/60 bg-amber-950/10" : "border-slate-800 bg-slate-900/60", className)}>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
        <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          Execution vs. Verification Comparison
        </span>
        {hasDiscrepancy ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded font-bold animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            DISCREPANCY DETECTED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded font-medium">
            <CheckCheck className="w-3 h-3" />
            RECONCILED
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Row 1: Command Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded bg-slate-950/80 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase">1. Command API Status (Acknowledgment Only)</div>
              <div className="text-xs text-slate-200 font-mono mt-0.5">
                HTTP {commandStatus?.status_code || 0} — {commandStatus?.message || 'No command logged'}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-mono self-end sm:self-center">
            {commandStatus?.issued_at ? new Date(commandStatus.issued_at).toLocaleTimeString() : 'N/A'}
          </div>
        </div>

        {/* Row 2: Verified State */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded bg-slate-950/80 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase">2. Independently Verified State</div>
              <div className="text-xs text-slate-300 mt-1">
                {verifiedState ? (
                  <FourStateBadge state={verifiedState.state} />
                ) : (
                  <span className="text-slate-400 text-xs">Awaiting fresh observations...</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-mono self-end sm:self-center">
            {verifiedState?.verified_at ? new Date(verifiedState.verified_at).toLocaleTimeString() : 'N/A'}
          </div>
        </div>

        {/* Discrepancy Note */}
        {hasDiscrepancy && (
          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-300">Containment Not Confirmed:</strong>
              {verifiedState?.discrepancy_notes || 
                "The target connector API acknowledged the request (200 OK), but independent fresh queries show the threat postconditions have not been satisfied."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
