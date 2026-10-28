import React, { useState, useEffect } from 'react';
import {
  ENTERPRISE_DATABASES,
  generatePipelineStages,
  DepartmentDatabase,
  PipelineStageEvent,
} from '@/services/pipelineService';
import {
  ShieldAlert,
  ShieldCheck,
  GitFork,
  FileCheck2,
  Lock,
  Play,
  RotateCcw,
  FastForward,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export const PipelineScreen: React.FC = () => {
  const [selectedDb, setSelectedDb] = useState<DepartmentDatabase>(ENTERPRISE_DATABASES[0]);
  const [stages, setStages] = useState<PipelineStageEvent[]>(() => generatePipelineStages(ENTERPRISE_DATABASES[0]));
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'payload' | 'invariant'>('details');

  useEffect(() => {
    const newStages = generatePipelineStages(selectedDb);
    setStages(newStages);
    setActiveStageIndex(0);
    setIsPlaying(false);
  }, [selectedDb]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStageIndex((prev) => {
          if (prev >= stages.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, stages.length]);

  const currentStage = stages[activeStageIndex] || stages[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Pipeline & Department Architecture
            </h1>
            <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
              Interactive Simulator
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate attack vectors across 6 enterprise databases and evaluate the 7-stage AegisCore response
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            )}
          >
            {isPlaying ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveStageIndex((prev) => Math.min(prev + 1, stages.length - 1))}
            disabled={activeStageIndex >= stages.length - 1}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs flex items-center gap-1 transition-colors"
          >
            <span>Next</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveStageIndex(0);
            }}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 Department Databases Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Enterprise Department Databases</span>
          </h2>
          <span className="text-xs text-slate-400">
            Click to switch simulation target
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ENTERPRISE_DATABASES.map((db) => {
            const isSelected = selectedDb.id === db.id;
            const isUnderAttack = db.status === 'under_attack';

            return (
              <div
                key={db.id}
                onClick={() => setSelectedDb(db)}
                className={cn(
                  "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between",
                  isSelected
                    ? "bg-slate-900 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase">
                      {db.department}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
                        isUnderAttack
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {isUnderAttack ? (
                        <>
                          <ShieldAlert className="w-3 h-3" /> Under Attack
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3" /> Healthy
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">
                    {db.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      {db.engine.split(' ')[0]}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                      {db.dataClassification}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {db.activeQueriesPerSec.toLocaleString()} qps
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">{db.connectedServices.length} Microservices</span>
                  <span className={cn(
                    "text-[11px] font-semibold",
                    isSelected ? "text-indigo-400" : "text-slate-500"
                  )}>
                    {isSelected ? "Active Target" : "Select"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Threat Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
            Target
          </span>
          <span className="font-semibold text-white">{selectedDb.name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-400 font-medium">{selectedDb.threatScenario.title}</span>
        </div>

        <Link
          to={`/investigation/${selectedDb.primaryIncidentId}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-start sm:self-auto font-medium"
        >
          <span>Open Dossier ({selectedDb.primaryIncidentId})</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 7-Stage Pipeline Stepper */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Response Pipeline Execution</span>
          </h2>
          <span className="text-xs text-slate-400">
            Step {activeStageIndex + 1} of {stages.length}: {currentStage.stageName}
          </span>
        </div>

        {/* Stepper Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stages.map((stage, idx) => {
            const isCurrent = idx === activeStageIndex;
            const isCompleted = idx < activeStageIndex;
            const isFlagged = stage.status === 'failed';

            return (
              <button
                key={stage.stageId}
                type="button"
                onClick={() => setActiveStageIndex(idx)}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between h-20",
                  isCurrent
                    ? "bg-indigo-950/80 border-indigo-500 ring-1 ring-indigo-500/50 text-white"
                    : isCompleted
                    ? "bg-slate-950/60 border-emerald-500/30 text-slate-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-slate-500">
                    0{stage.stageId}
                  </span>
                  {isFlagged ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  )}
                </div>

                <div className="text-[11px] font-semibold leading-tight line-clamp-2">
                  {stage.stageName}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Inspector */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-sm font-bold text-white">
                {currentStage.stageName}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Subsystem: <span className="text-slate-300 font-medium">{currentStage.subsystem}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  "px-3 py-1 rounded transition-colors font-medium",
                  activeTab === 'details' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Metrics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payload')}
                className={cn(
                  "px-3 py-1 rounded transition-colors font-medium",
                  activeTab === 'payload' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Payload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('invariant')}
                className={cn(
                  "px-3 py-1 rounded transition-colors font-medium",
                  activeTab === 'invariant' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Guarantee
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            {currentStage.summary}
          </div>

          {/* Tab 1: Metrics */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentStage.technicalDetails.metrics &&
                Object.entries(currentStage.technicalDetails.metrics).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                    <div className="text-[11px] text-slate-400">{key}</div>
                    <div className="text-xs font-semibold text-white mt-1 break-words">
                      {String(val)}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Tab 2: Payload */}
          {activeTab === 'payload' && (
            <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3.5 text-xs text-emerald-400 overflow-x-auto font-mono">
              <pre className="whitespace-pre">
                {currentStage.technicalDetails.payloadSnippet ||
                  currentStage.technicalDetails.codeSnippet ||
                  'No payload attached.'}
              </pre>
            </div>
          )}

          {/* Tab 3: Invariant */}
          {activeTab === 'invariant' && (
            <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-800/40 text-xs text-slate-300">
              <div className="font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Architectural Invariant Guarantee</span>
              </div>
              <p className="leading-relaxed">
                {currentStage.technicalDetails.invariantVerified}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3 USPs Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* USP 1 */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-400 uppercase mb-1">USP 1</div>
            <h3 className="text-sm font-bold text-white">Graph Blast Radius (Neo4j)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Selects targeted credential revocation over blunt database shutdown.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">87.2% Less Disruption</span>
            <Link to="/graph" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>View Graph</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* USP 2 */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase mb-1">USP 2</div>
            <h3 className="text-sm font-bold text-white">Deterministic Policy Gates</h3>
            <p className="text-xs text-slate-400 mt-1">
              Evaluates structured evidence outside the LLM, neutralizing prompt injection.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">0.0% Unsafe Actions</span>
            <Link to="/response" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>View Gates</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* USP 3 */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-sky-400 uppercase mb-1">USP 3</div>
            <h3 className="text-sm font-bold text-white">Closed-Loop Verification</h3>
            <p className="text-xs text-slate-400 mt-1">
              Independently polls ground truth, catching silent API failures (200 OK bugs).
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">100% Silent Failures Caught</span>
            <Link to="/audit" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>View Audit</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
