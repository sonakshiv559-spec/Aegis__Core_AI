import React from 'react';
import { SourceProvenance } from '@/types';
import { cn } from '@/lib/utils';
import { FileText, Sparkles, ExternalLink } from 'lucide-react';

interface ClaimProps {
  text: string;
  isInference?: boolean;
  sourceRef?: SourceProvenance;
  onViewEvidence?: (eventId: string) => void;
  className?: string;
}

export const Claim: React.FC<ClaimProps> = ({
  text,
  isInference = false,
  sourceRef,
  onViewEvidence,
  className,
}) => {
  // Enforce the rule: Either sourceRef must be present OR it must be explicitly marked as an inference
  const hasValidSource = !!(sourceRef && sourceRef.event_id && sourceRef.source_product);
  const effectiveInference = isInference || !hasValidSource;

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 py-1 px-2.5 rounded-md border text-xs leading-relaxed transition-all",
        effectiveInference
          ? "bg-amber-950/20 border-amber-800/40 text-amber-200/90"
          : "bg-slate-900/80 border-slate-700/60 text-slate-200",
        className
      )}
    >
      <span className="font-normal">{text}</span>

      {effectiveInference ? (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-amber-500/20 border border-amber-500/30 text-amber-300"
          title="This statement is an analytical model inference or hypothesis, not directly corroborated by hard telemetry records"
        >
          <Sparkles className="w-2.5 h-2.5" />
          INFERENCE
        </span>
      ) : (
        <button
          type="button"
          onClick={() => sourceRef && onViewEvidence?.(sourceRef.event_id)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-950/60 border border-sky-700/40 text-sky-300 hover:bg-sky-900/60 hover:border-sky-500 transition-colors"
          title={`Source Provenance: ${sourceRef?.source_product} at ${sourceRef?.time_observed} (Event ID: ${sourceRef?.event_id})`}
        >
          <FileText className="w-2.5 h-2.5" />
          <span className="font-semibold">{sourceRef?.source_product}</span>
          <span className="text-sky-400/70">#{sourceRef?.event_id.slice(-6)}</span>
          <ExternalLink className="w-2 h-2 opacity-70" />
        </button>
      )}
    </div>
  );
};
