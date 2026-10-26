import type { Node, Edge } from 'reactflow';

export interface GraphNodeData {
  label: string;
  type: 'identity' | 'endpoint' | 'service' | 'database';
  criticality: 'Tier 1' | 'Tier 2' | 'Tier 3';
  isThreatTarget?: boolean;
  isDisruptedByAction?: boolean;
  owner?: string;
}

export const initialGraphNodes: Node<GraphNodeData>[] = [
  {
    id: 'node-identity-1',
    type: 'default',
    data: {
      label: 'svc-analytics-prod (Identity)',
      type: 'identity',
      criticality: 'Tier 1',
      isThreatTarget: true,
      owner: 'Data Eng',
    },
    position: { x: 50, y: 150 },
    className: 'bg-rose-950/80 border-2 border-rose-500 text-rose-200 rounded-lg p-3 text-xs font-mono shadow-lg',
  },
  {
    id: 'node-endpoint-1',
    type: 'default',
    data: {
      label: 'k8s-node-worker-04 (Endpoint)',
      type: 'endpoint',
      criticality: 'Tier 2',
      isThreatTarget: true,
      owner: 'Platform Ops',
    },
    position: { x: 300, y: 150 },
    className: 'bg-amber-950/80 border-2 border-amber-500 text-amber-200 rounded-lg p-3 text-xs font-mono shadow-lg',
  },
  {
    id: 'node-service-1',
    type: 'default',
    data: {
      label: 'svc-customer-reporting (Service)',
      type: 'service',
      criticality: 'Tier 1',
      isDisruptedByAction: true,
      owner: 'BI Team',
    },
    position: { x: 580, y: 50 },
    className: 'bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-xs font-mono shadow-md',
  },
  {
    id: 'node-service-2',
    type: 'default',
    data: {
      label: 'batch-etl-pipeline (Service)',
      type: 'service',
      criticality: 'Tier 2',
      isDisruptedByAction: true,
      owner: 'Data Eng',
    },
    position: { x: 580, y: 220 },
    className: 'bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-xs font-mono shadow-md',
  },
  {
    id: 'node-database-1',
    type: 'default',
    data: {
      label: 'db-customer-analytics-cluster (Database)',
      type: 'database',
      criticality: 'Tier 1',
      owner: 'DB Reliability',
    },
    position: { x: 880, y: 140 },
    className: 'bg-indigo-950/80 border-2 border-indigo-500 text-indigo-200 rounded-lg p-3 text-xs font-mono shadow-xl',
  },
];

export const initialGraphEdges: Edge[] = [
  {
    id: 'edge-1-2',
    source: 'node-identity-1',
    target: 'node-endpoint-1',
    label: 'AUTHENTICATED_TO',
    animated: true,
    style: { stroke: '#ef4444', strokeWidth: 2 },
  },
  {
    id: 'edge-2-3',
    source: 'node-endpoint-1',
    target: 'node-service-1',
    label: 'HOSTS',
    style: { stroke: '#64748b' },
  },
  {
    id: 'edge-2-4',
    source: 'node-endpoint-1',
    target: 'node-service-2',
    label: 'EXECUTES',
    style: { stroke: '#64748b' },
  },
  {
    id: 'edge-3-5',
    source: 'node-service-1',
    target: 'node-database-1',
    label: 'READS_WRITES',
    style: { stroke: '#6366f1', strokeWidth: 1.5 },
  },
  {
    id: 'edge-4-5',
    source: 'node-service-2',
    target: 'node-database-1',
    label: 'BATCH_INGESTS',
    style: { stroke: '#6366f1', strokeWidth: 1.5 },
  },
];
