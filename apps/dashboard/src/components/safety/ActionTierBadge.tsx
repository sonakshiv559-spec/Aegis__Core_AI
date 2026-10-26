import React from 'react';
import { ActionTier } from '@/types';
import { cn } from '@/lib/utils';
import { Eye, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ActionTierBadgeProps {
  tier: ActionTier;
  showAutoEligibility?: boolean;
  className?: string;
}

export const ActionTierBadge: React.FC<ActionTierBadgeProps> = ({
  tier,
  showAutoEligibility = true,
  className,
}) => {
  const config = {
    0: {
      label: 'Tier 0: Observe',
      short: 'T0: Observe',
      icon: Eye,
      style: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
      autoAllowed: true,
      description: 'Enrich alert, query logs, generate summary report. Read-only.',
    },
    1: {
      label: 'Tier 1: Low-Impact Reversible',
      short: 'T1: Low-Impact',
      icon: RotateCcw,
      style: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      autoAllowed: true, // In sandbox / explicit preapproved scope only
      description: 'Temporary watch, test token revocation, disposable lab isolate. Readily reversible.',
    },
    2: {
      label: 'Tier 2: Material Change',
      short: 'T2: Material',
      icon: AlertTriangle,
      style: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      autoAllowed: false, // Never auto-executed in initial release
      description: 'Disable employee account, quarantine production endpoint, modify cloud security group.',
    },
    3: {
      label: 'Tier 3: Critical / Broad',
      short: 'T3: Critical',
      icon: ShieldAlert,
      style: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      autoAllowed: false, // Never auto-executed
      description: 'Production network policy, critical IAM root/infra, tenant-wide controls.',
    },
  }[tier];

  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium border",
          config.style
        )}
        title={config.description}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>

      {showAutoEligibility && (
        <span
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded border",
            config.autoAllowed
              ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/20"
              : "text-rose-400 border-rose-500/30 bg-rose-950/20"
          )}
          title={config.autoAllowed ? "Eligible for preauthorized sandbox automation" : "Auto-execute strictly disabled: Human approval required"}
        >
          {config.autoAllowed ? 'AUTO-PERMITTED (SANDBOX)' : 'MANUAL APPROVAL ONLY'}
        </span>
      )}
    </div>
  );
};
