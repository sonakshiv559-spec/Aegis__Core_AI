import React, { useState, useEffect } from 'react';
import {
  ENTERPRISE_DATABASES,
  generatePipelineStages,
  DepartmentDatabase,
  PipelineStageEvent,
} from '@/services/pipelineService';
import {
  Database,
  ShieldAlert,
  ShieldCheck,
  Activity,
  GitFork,
  FileCheck2,
  Lock,
  Play,
  RotateCcw,
  FastForward,
  Cpu,
  Layers,
  ArrowRight,
  AlertTriangle,
  Radio,
  CheckCircle2,
  XCircle,
  Code2,
  Terminal,
  Server,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export const PipelineScreen: React.FC = () => {
  const [selectedDb, setSelectedDb] = useState<DepartmentDatabase>(ENTERPRISE_DATABASES[0]);
  const [stages, setStages] = useState<PipelineStageEvent[]>(() => generatePipelineStages(ENTERPRISE_DATABASES[0]));
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'payload' | 'invariant'>('details');

  // When selected DB changes, re-generate pipeline stages
  useEffect(() => {
    const newStages = generatePipelineStages(selectedDb);
    setStages(newStages);
    setActiveStageIndex(0);
    setIsPlaying(false);
  }, [selectedDb]);

  // Auto-play timer
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
      }, 2400);
    }
    return () => clearInterval(timer);
  }, [isPlaying, stages.length]);

  const currentStage = stages[activeStageIndex] || stages[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-indigo-400" />
              <span>Full Pipeline & Department Database Architecture</span>
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE SIMULATOR
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono mt-1">
            Interactive multi-department attack simulator demonstrating all 7 AegisCore capabilities across 6 enterprise databases
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all shadow-md",
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950"
            )}
          >
            {isPlaying ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>Pause Simulation</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Play Pipeline</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveStageIndex((prev) => Math.min(prev + 1, stages.length - 1))}
            disabled={activeStageIndex >= stages.length - 1}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono text-xs flex items-center gap-1 transition-colors"
          >
            <span>Next Step</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveStageIndex(0);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset to Stage 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SECTION 1: 6 Enterprise Department Databases
      ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Enterprise Department Databases (Target Ecosystem)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Click any database to simulate threat & evaluate pipeline response
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENTERPRISE_DATABASES.map((db) => {
            const isSelected = selectedDb.id === db.id;
            const isUnderAttack = db.status === 'under_attack';

            return (
              <div
                key={db.id}
                onClick={() => setSelectedDb(db)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between",
                  isSelected
                    ? "bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-950/50"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                )}
              >
                {/* Glow accent */}
                {isSelected && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                )}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-semibold uppercase text-indigo-400">
                        {db.department}
                      </span>
                      <h3 className="text-sm font-bold text-white leading-tight mt-0.5">
                        {db.name}
                      </h3>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex-shrink-0 flex items-center gap-1",
                        isUnderAttack
                          ? "bg-rose-950/80 text-rose-300 border-rose-500/60 animate-pulse"
                          : "bg-emerald-950/80 text-emerald-300 border-emerald-500/60"
                      )}
                    >
                      {isUnderAttack ? (
                        <>
                          <ShieldAlert className="w-3 h-3 text-rose-400" /> ATTACK ACTIVE
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> HEALTHY
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono text-slate-300 my-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Engine / Architecture:</span>
                      <span className="text-slate-200 font-medium">{db.engine}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Classification:</span>
                      <span className="text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                        {db.dataClassification}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Data Records:</span>
                      <span className="text-slate-200">{db.recordCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Connected Services:</span>
                      <span className="text-sky-400 font-semibold">{db.connectedServices.length} Microservices</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] font-mono">
                    <span className="text-slate-300">Query Rate: </span>
                    <span className="text-white font-bold">{db.activeQueriesPerSec.toLocaleString()} qps</span>
                  </div>

                  <span
                    className={cn(
                      "text-[11px] font-mono px-2 py-0.5 rounded font-medium flex items-center gap-1",
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:text-white"
                    )}
                  >
                    <span>{isSelected ? 'Simulating' : 'Select'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SECTION 2: Active Scenario Details & Threat Card
      ──────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-bold">
              Active Simulation Target
            </span>
            <span className="text-xs font-bold text-white">{selectedDb.name}</span>
            <span className="text-xs font-mono text-slate-300">({selectedDb.id})</span>
          </div>
          <p className="text-xs text-slate-300 font-mono">
            <strong className="text-amber-300">Threat Injected:</strong> {selectedDb.threatScenario.title} — {selectedDb.threatScenario.description}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to={`/investigation/${selectedDb.primaryIncidentId}`}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-mono flex items-center gap-1.5 transition-colors border border-indigo-500/40"
          >
            <span>Open Incident Dossier ({selectedDb.primaryIncidentId})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SECTION 3: 7-Stage Pipeline Interactive Flow Visualizer
      ──────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>2. End-to-End AegisCore Response Pipeline (Phases 1 — 8)</span>
            </h2>
            <p className="text-xs text-slate-300 font-mono">
              Click any stage node below to inspect live intermediate data representations
            </p>
          </div>

          <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-md">
            Stage {activeStageIndex + 1} of {stages.length}: {currentStage.stageName}
          </span>
        </div>

        {/* Stepper Progress Bar */}
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
                  "p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24",
                  isCurrent
                    ? "bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg text-white"
                    : isCompleted
                    ? "bg-slate-950 border-emerald-500/40 text-slate-300 hover:border-emerald-500"
                    : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700"
                )}
              >
                {/* Stage number & status badge */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-bold text-slate-300">
                    STAGE 0{stage.stageId}
                  </span>
                  {isFlagged ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-bold leading-tight line-clamp-2">
                    {stage.stageName}
                  </div>
                  <div className="text-[9px] font-mono text-indigo-300/80 mt-1">
                    {stage.phaseRef}
                  </div>
                </div>

                {/* Progress highlight line */}
                {isCurrent && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Stage Detailed Inspector Card */}
        <div className="rounded-xl border border-slate-800 bg-[#070b14] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded">
                  {currentStage.phaseRef}
                </span>
                <h3 className="text-base font-bold text-white">
                  {currentStage.stageName}
                </h3>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1">
                Subsystem: <strong className="text-slate-200">{currentStage.subsystem}</strong>
              </p>
            </div>

            {/* Inspector Tabs */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  "px-3 py-1 rounded transition-colors",
                  activeTab === 'details' ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                )}
              >
                Metrics & Logic
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payload')}
                className={cn(
                  "px-3 py-1 rounded transition-colors",
                  activeTab === 'payload' ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                )}
              >
                OCSF / Code Payload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('invariant')}
                className={cn(
                  "px-3 py-1 rounded transition-colors",
                  activeTab === 'invariant' ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                )}
              >
                Safety Invariant
              </button>
            </div>
          </div>

          {/* Executive Summary Bar */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-200 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-amber-400 font-bold uppercase mr-1">Pipeline Operation:</span>
              {currentStage.summary}
            </div>
          </div>

          {/* Tab 1: Structured Metrics */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentStage.technicalDetails.metrics &&
                Object.entries(currentStage.technicalDetails.metrics).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-300 uppercase">{key}</div>
                    <div className="text-xs font-mono font-bold text-white mt-1 break-words">
                      {String(val)}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Tab 2: Raw JSON or Code Snippet */}
          {activeTab === 'payload' && (
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-emerald-400">
              <pre className="whitespace-pre">
                {currentStage.technicalDetails.payloadSnippet ||
                  currentStage.technicalDetails.codeSnippet ||
                  'No raw payload attached.'}
              </pre>
            </div>
          )}

          {/* Tab 3: Safety Invariant */}
          {activeTab === 'invariant' && (
            <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-800/60 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Non-Negotiable Architecture Guarantee</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {currentStage.technicalDetails.invariantVerified}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SECTION 4: 3 Core USPs Direct Working Showcase
      ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitFork className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            3. Unique Selling Propositions (USPs 1, 2, 3) Live Comparison
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* USP 1 Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded">
                  USP 1: Business-Impact Aware
                </span>
                <GitFork className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white">
                Context Graph Blast Radius Optimization
              </h3>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                Conventional SOAR isolates the entire database or host, causing severe collateral downtime. AegisCore traverses the Neo4j dependency graph via BFS to choose surgical token/route containment.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between text-rose-400">
                <span>Traditional SOAR Disruption:</span>
                <span className="font-bold">0.85 (High Outage)</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>AegisCore Disruption:</span>
                <span className="font-bold">0.10 (87.2% Less Disruption)</span>
              </div>
            </div>

            <Link
              to="/graph"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Inspect Topological Graph</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* USP 2 Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  USP 2: Evidence-Gated Autonomy
                </span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white">
                Deterministic Policy Gates & Contracts
              </h3>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                Autonomous LLMs are vulnerable to prompt injections in headers. AegisCore evaluates deterministic evidence predicates outside LLM weights, binding actions with cryptographic SHA-256 seals.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between text-rose-400">
                <span>LLM Copilot Unsafe Actions:</span>
                <span className="font-bold">28.6% (Prompt Hijack)</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>AegisCore Unsafe Action Rate:</span>
                <span className="font-bold">0.0% (Mathematically Sealed)</span>
              </div>
            </div>

            <Link
              to="/response"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View Policy Gates & Approvals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* USP 3 Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded">
                  USP 3: Verified Remediation
                </span>
                <FileCheck2 className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="text-sm font-bold text-white">
                Closed-Loop Verification & Recovery Loop
              </h3>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                Treating HTTP 200 OK as success leaves enterprises vulnerable to silent cloud API failures. AegisCore independently introspects ground-truth state before marking containment success.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between text-rose-400">
                <span>SOAR / Copilot Silent Catch:</span>
                <span className="font-bold">0.0% (Blind Trust 200 OK)</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>AegisCore Catch Rate:</span>
                <span className="font-bold">100.0% (Discrepancy Caught)</span>
              </div>
            </div>

            <Link
              to="/audit"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Inspect Verification Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
