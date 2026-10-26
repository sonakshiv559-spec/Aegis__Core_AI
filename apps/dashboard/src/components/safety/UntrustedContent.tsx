import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ShieldAlert, Copy, Check } from 'lucide-react';

interface UntrustedContentProps {
  content: string;
  sourceLabel?: string;
  maxLines?: number;
  className?: string;
}

/**
 * UntrustedContent renders raw telemetry, syslog strings, headers, and ticket texts
 * strictly as plain uninterpreted text to protect against Prompt Injection,
 * XSS, and HTML/Markdown execution exploits.
 */
export const UntrustedContent: React.FC<UntrustedContentProps> = ({
  content,
  sourceLabel = 'Raw Telemetry Payload',
  maxLines = 10,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative rounded-md border border-slate-800 bg-[#060911] overflow-hidden", className)}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            UNTRUSTED TELEMETRY (INERT ESCAPED TEXT)
          </span>
          <span className="text-slate-400 font-mono">{sourceLabel}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors font-mono text-[10px]"
          title="Copy raw string"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <pre
        className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all select-text selection:bg-slate-700 leading-relaxed"
        style={{ maxHeight: maxLines ? `${maxLines * 1.5}rem` : undefined }}
      >
        {/* Strictly plain text node: no dangerouslySetInnerHTML, zero HTML rendering */}
        {content}
      </pre>
    </div>
  );
};
