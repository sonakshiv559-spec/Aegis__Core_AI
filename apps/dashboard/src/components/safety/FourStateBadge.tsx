import React from 'react';
import { VerificationState } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldX } from 'lucide-react';

interface FourStateBadgeProps {
  state: VerificationState;
  showWarningNotice?: boolean;
  className?: string;
}

export const FourStateBadge: React.FC<FourStateBadgeProps> = ({
  state,
  showWarningNotice = false,
  className,
}) => {
  const config = {
    success: {
      label: 'VERIFIED SUCCESS',
      shortLabel: 'SUCCESS',
      icon: CheckCircle2,
      style: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
      description: 'Postcondition tests satisfied; threat containment verified by fresh observations.',
    },
    partial: {
      label: 'PARTIAL CONTAINMENT',
      shortLabel: 'PARTIAL',
      icon: AlertTriangle,
      style: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
      description: 'Some security objectives met, but secondary symptoms or dependent risks persist.',
    },
    failure: {
      label: 'VERIFIED FAILURE',
      shortLabel: 'FAILURE',
      icon: XCircle,
      style: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
      description: 'Action execution did not satisfy containment criteria. Re-evaluating alternatives.',
    },
    unknown: {
      label: 'STATE UNKNOWN (BLOCKED)',
      shortLabel: 'UNKNOWN',
      icon: HelpCircle,
      style: 'text-purple-300 border-purple-500/50 bg-purple-950/40 animate-pulse',
      description: 'Telemetry timeout or ambiguous connector state. Further automation is blocked.',
    },
  }[state];

  const Icon = config.icon;

  return (
    <div className={cn("inline-flex flex-col gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold border tracking-wide",
          config.style
        )}
        title={config.description}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>

      {state === 'unknown' && showWarningNotice && (
        <div className="flex items-start gap-1.5 p-2 rounded bg-purple-950/60 border border-purple-600/40 text-purple-200 text-xs">
          <ShieldX className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-purple-300">Safety Guardrail Active:</strong>
            Unknown verification state automatically freezes automated execution. Further high-impact action is
            strictly blocked and designated human escalation is mandated.
          </div>
        </div>
      )}
    </div>
  );
};
