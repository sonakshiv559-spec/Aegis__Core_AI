import { TelemetryMetrics } from '@/types';

export const mockMetrics: TelemetryMetrics = {
  events_per_sec: 14280,
  event_lag_seconds: 1.2,
  unresolved_uncertainty_count: 3,
  verified_containment_rate_pct: 94.5,
  dead_letter_count: 0,
  incidents_by_severity: {
    critical: 1,
    high: 2,
    medium: 4,
    low: 12,
  },
  connectors: [
    {
      name: 'Okta Identity Cloud',
      type: 'Identity Provider',
      status: 'healthy',
      latency_ms: 142,
      error_rate_pct: 0.01,
      last_sync: '10s ago',
    },
    {
      name: 'CrowdStrike Falcon EDR',
      type: 'Endpoint Detection',
      status: 'healthy',
      latency_ms: 210,
      error_rate_pct: 0.04,
      last_sync: '5s ago',
    },
    {
      name: 'AWS CloudTrail Ingestion',
      type: 'Cloud Audit Logs',
      status: 'degraded',
      latency_ms: 1080,
      error_rate_pct: 2.1,
      last_sync: '18m ago (eventual delivery lag)',
    },
    {
      name: 'Palo Alto Panorama',
      type: 'Next-Gen Firewall',
      status: 'healthy',
      latency_ms: 95,
      error_rate_pct: 0.0,
      last_sync: '2s ago',
    },
    {
      name: 'Kubernetes Audit Stream',
      type: 'Container Orchestration',
      status: 'healthy',
      latency_ms: 60,
      error_rate_pct: 0.02,
      last_sync: '1s ago',
    },
  ],
};

export const mockTimeSeriesData = [
  { time: '04:00', events: 11200, anomalies: 4, verifiedActions: 2 },
  { time: '06:00', events: 12800, anomalies: 7, verifiedActions: 3 },
  { time: '08:00', events: 16400, anomalies: 14, verifiedActions: 6 },
  { time: '10:00', events: 19800, anomalies: 22, verifiedActions: 9 },
  { time: '12:00', events: 18200, anomalies: 18, verifiedActions: 7 },
  { time: '14:00', events: 17500, anomalies: 12, verifiedActions: 5 },
  { time: '16:00', events: 14280, anomalies: 8, verifiedActions: 4 },
];
