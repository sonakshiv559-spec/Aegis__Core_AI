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
import { GitFork, ShieldAlert, Layers } from 'lucide-react';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';

export const DependencyGraphScreen: React.FC = () => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-2026-8841');
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>(initialGraphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraphEdges);
  const [selectedNode, setSelectedNode] = useState<Node<GraphNodeData> | null>(null);
  const [simulateBlastRadius, setSimulateBlastRadius] = useState(true);

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
    <div className="p-6 space-y-4 max-w-7xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            <span>Asset Dependency Graph</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Topological blast radius mapping to minimize operational downtime
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Incident Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="INC-2026-8841" className="bg-slate-900">INC-8841 (Aurora DB)</option>
              <option value="INC-2026-8843" className="bg-slate-900">INC-8843 (PCI Enclave)</option>
              <option value="INC-2026-8845" className="bg-slate-900">INC-8845 (AWS SG)</option>
              <option value="INC-2026-8847" className="bg-slate-900">INC-8847 (Shared NFS)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <input
              type="checkbox"
              checked={simulateBlastRadius}
              onChange={(e) => setSimulateBlastRadius(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Highlight Blast Radius</span>
          </label>
        </div>
      </div>

      {/* Main Canvas + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow min-h-0">
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

          {/* Simple Legend */}
          <div className="absolute bottom-3 left-3 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1 backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-rose-500" /> Threat Target
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-amber-500" /> Connected Service
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-emerald-500" /> Preserved Asset
            </div>
          </div>
        </div>

        {/* Node Details */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-medium">Selected Asset</span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {selectedNode.data.label}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Criticality</div>
                  <div className="font-semibold text-slate-200">{selectedNode.data.criticality}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Category</div>
                  <div className="font-semibold text-slate-200 capitalize">{selectedNode.data.type}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Owner</div>
                  <div className="font-semibold text-slate-200">{selectedNode.data.owner || 'Platform Ops'}</div>
                </div>

                {selectedNode.data.isThreatTarget && (
                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>Primary threat epicenter</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-xs py-8">
              Click any graph node to inspect properties.
            </div>
          )}

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Traversed via BFS depth=3
          </div>
        </div>
      </div>
    </div>
  );
};
