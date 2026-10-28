import React, { useState, useEffect } from 'react';
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
import { GitFork, ShieldAlert, Info, Layers } from 'lucide-react';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';

export const DependencyGraphScreen: React.FC = () => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-2026-8841');
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>(initialGraphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraphEdges);
  const [selectedNode, setSelectedNode] = useState<Node<GraphNodeData> | null>(null);
  const [simulateBlastRadius, setSimulateBlastRadius] = useState(true);

  // Load real graph when incident changes
  useEffect(() => {
    let isMounted = true;
    apiClient.getDependencyGraph(selectedIncidentId).then((graph) => {
      if (isMounted) {
        setNodes(graph.nodes);
        setEdges(graph.edges);
        if (graph.nodes.length > 0) {
          setSelectedNode(graph.nodes[0]);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId, setNodes, setEdges]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            <span>Asset & Service Dependency Graph (USP 1)</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real Neo4j topological graph traversal for blast-radius calculation and impact-constrained containment
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Incident Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="INC-2026-8841" className="bg-slate-900">INC-8841 (Shared Aurora DB)</option>
              <option value="INC-2026-8843" className="bg-slate-900">INC-8843 (PCI Lateral Enclave)</option>
              <option value="INC-2026-8845" className="bg-slate-900">INC-8845 (AWS SG Exposure)</option>
              <option value="INC-2026-8847" className="bg-slate-900">INC-8847 (Ransomware NFS Storage)</option>
            </select>
          </div>

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
              <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Malicious Threat Target
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Upstream Microservice
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Preserved Mission-Critical Asset
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded ring-2 ring-amber-400 bg-amber-950" /> Collateral Disruption Warning
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
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Criticality Tier</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{selectedNode.data.criticality}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Entity Category</div>
                  <div className="font-semibold text-slate-200 mt-0.5 capitalize">{selectedNode.data.type}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Owner / Team</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{selectedNode.data.owner || 'Unassigned'}</div>
                </div>

                {selectedNode.data.isThreatTarget && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight">
                      Primary threat target or anomalous activity epicenter.
                    </span>
                  </div>
                )}

                {simulateBlastRadius && selectedNode.data.isDisruptedByAction && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight">
                      Predicted collateral disruption if broad containment action is executed.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-xs font-mono py-10">
              Click any graph node to inspect live topological attributes.
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
            Graph traversed via BFS depth=3 from target entity.
          </div>
        </div>
      </div>
    </div>
  );
};
