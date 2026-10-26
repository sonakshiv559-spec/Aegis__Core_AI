import React, { useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { initialGraphNodes, initialGraphEdges, GraphNodeData } from '@/mocks/graph.mock';
import { GitFork, ShieldAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DependencyGraphScreen: React.FC = () => {
  const [nodes, , onNodesChange] = useNodesState<GraphNodeData>(initialGraphNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialGraphEdges);
  const [selectedNode, setSelectedNode] = useState<Node<GraphNodeData> | null>(initialGraphNodes[0]);
  const [simulateBlastRadius, setSimulateBlastRadius] = useState(true);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            <span>Asset & Service Dependency Graph</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Neo4j live dependency traversal for blast-radius calculation and impact-constrained containment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <input
              type="checkbox"
              checked={simulateBlastRadius}
              onChange={(e) => setSimulateBlastRadius(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Highlight Predicted Blast Radius</span>
          </label>
        </div>
      </div>

      {/* Main Layout: Interactive Graph on left, Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
        {/* Interactive React Flow Canvas */}
        <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-[#070b14] relative overflow-hidden h-full">
          <ReactFlow
            nodes={nodes.map((n) => {
              if (simulateBlastRadius && n.data.isDisruptedByAction) {
                return {
                  ...n,
                  className: `${n.className} ring-2 ring-amber-500/80 ring-offset-2 ring-offset-slate-950`,
                };
              }
              return n;
            })}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
          >
            <Background color="#1e293b" gap={16} size={1} />
            <Controls className="bg-slate-900 border border-slate-700 text-white fill-white" />
            <MiniMap
              nodeColor="#4f46e5"
              maskColor="rgba(9, 13, 22, 0.85)"
              className="bg-slate-950 border border-slate-800 rounded"
            />
          </ReactFlow>

          <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1 backdrop-blur-sm pointer-events-none">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Graph Legend</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Identity Target
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Endpoint / Worker
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-slate-600" /> Microservice
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Database Cluster
            </div>
          </div>
        </div>

        {/* Selected Entity Context Panel */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 flex flex-col justify-between overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">Selected Node Details</span>
                <h3 className="text-sm font-bold text-white mt-1 break-words">
                  {selectedNode.data.label}
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Criticality Tier</span>
                  <span className={cn(
                    "font-bold text-xs",
                    selectedNode.data.criticality === 'Tier 1' ? "text-rose-400" : "text-amber-400"
                  )}>
                    {selectedNode.data.criticality} (High Impact)
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Operational Owner</span>
                  <span className="text-slate-200">{selectedNode.data.owner || 'Unassigned'}</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Incident Role</span>
                  <span className="text-rose-300">
                    {selectedNode.data.isThreatTarget ? 'Tagged as Threat Focal Point' : 'Downstream Dependent'}
                  </span>
                </div>
              </div>

              {selectedNode.data.isDisruptedByAction && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    BLAST RADIUS WARNING
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    If Tier 2 host isolation is chosen, this service will experience immediate unplanned downtime.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4" /> Click any graph node to inspect dependencies.
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
            Dependency updates synced via Neo4j event hooks in real time.
          </div>
        </div>
      </div>
    </div>
  );
};
