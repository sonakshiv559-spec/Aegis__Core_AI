import React from 'react';
import { ScoreDimensions as ScoreDimensionsType } from '@/types';
import { cn, formatPercent } from '@/lib/utils';
import { Activity, ShieldAlert, Network, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ScoreDimensionsProps {
  scores: ScoreDimensionsType;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export const ScoreDimensions: React.FC<ScoreDimensionsProps> = ({
  scores,
  size = 'md',
  showLabels = true,
  className,
}) => {
  const dimensions = [
    {
      key: 'anomaly_score',
      label: 'Anomaly Score',
      shortLabel: 'Anomaly',
      value: scores.anomaly_score,
      icon: Activity,
      tooltip: 'Statistical rarity of telemetry relative to historical baseline',
      colorClass: 'from-amber-500 to-amber-600',
      badgeClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    {
      key: 'threat_confidence',
      label: 'Threat Confidence',
      shortLabel: 'Confidence',
      value: scores.threat_confidence,
      icon: ShieldAlert,
      tooltip: 'Evidence strength specifically supporting malicious adversarial activity',
      colorClass: 'from-rose-500 to-rose-600',
      badgeClass: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      key: 'business_impact',
      label: 'Business Impact',
      shortLabel: 'Impact',
      value: scores.business_impact,
      icon: Network,
      tooltip: 'Criticality and dependency connectivity of targeted infrastructure',
      colorClass: 'from-purple-500 to-purple-600',
      badgeClass: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    },
    {
      key: 'action_risk',
      label: 'Action Risk',
      shortLabel: 'Action Risk',
      value: scores.action_risk,
      icon: AlertTriangle,
      tooltip: 'Invasiveness, potential operational collateral damage, and irreversibility of response',
      colorClass: 'from-orange-500 to-orange-600',
      badgeClass: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    },
    {
      key: 'evidence_sufficiency',
      label: 'Evidence Sufficiency',
      shortLabel: 'Sufficiency',
      value: scores.evidence_sufficiency,
      icon: CheckCircle2,
      tooltip: 'Presence of mandatory corroborating telemetry artifacts required for policy gating',
      colorClass: scores.evidence_sufficiency >= 0.8 ? 'from-emerald-500 to-emerald-600' : 'from-rose-500 to-amber-600',
      badgeClass: scores.evidence_sufficiency >= 0.8 
        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
        : 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
  ];

  if (size === 'sm') {
    return (
      <div className={cn("grid grid-cols-5 gap-2 text-xs", className)}>
        {dimensions.map((dim) => (
          <div
            key={dim.key}
            className="flex flex-col bg-slate-900/80 border border-slate-800 rounded p-1.5"
            title={`${dim.label}: ${formatPercent(dim.value)} — ${dim.tooltip}`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="truncate">{dim.shortLabel}</span>
              <span className={cn("font-mono font-medium px-1 rounded", dim.badgeClass)}>
                {formatPercent(dim.value)}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", dim.colorClass)}
                style={{ width: `${Math.min(100, Math.max(0, dim.value * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-2.5", className)}>
      {showLabels && (
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Multi-Dimensional Risk & Evidence Evaluation (Non-Collapsed)
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            5 Distinct Dimensions
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {dimensions.map((dim) => {
          const Icon = dim.icon;
          return (
            <div
              key={dim.key}
              className="group relative flex flex-col justify-between bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-md p-2.5 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1 font-medium">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{dim.label}</span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-lg font-mono font-bold text-white tracking-tight">
                    {formatPercent(dim.value)}
                  </span>
                  <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", dim.badgeClass)}>
                    {dim.value >= 0.75 ? 'HIGH' : dim.value >= 0.4 ? 'MED' : 'LOW'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", dim.colorClass)}
                  style={{ width: `${Math.min(100, Math.max(0, dim.value * 100))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-300 mt-2 line-clamp-1 group-hover:line-clamp-none transition-all">
                {dim.tooltip}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
