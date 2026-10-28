// =============================================================
// AegisCore AI – Neo4j Context & Dependency Graph Seed Script
// =============================================================

// Clear existing graph for clean initialization
MATCH (n) DETACH DELETE n;

// ── Teams ───────────────────────────────────────────────────
CREATE (t_sec:Team {id: 'team-sec', name: 'Security Infrastructure', owner: 'Alex Mercer'})
CREATE (t_data:Team {id: 'team-data', name: 'Data Engineering', owner: 'Elena Rostova'})
CREATE (t_bi:Team {id: 'team-bi', name: 'Business Intelligence', owner: 'David Kim'})
CREATE (t_comm:Team {id: 'team-comm', name: 'Core Commerce', owner: 'Priya Sharma'})
CREATE (t_platform:Team {id: 'team-platform', name: 'Platform Operations', owner: 'Marcus Vance'});

// ── Identities ──────────────────────────────────────────────
CREATE (u_michael:Identity {
  id: 'usr-0042',
  name: 'michael.chen@corp.internal',
  type: 'user',
  role: 'Senior Data Engineer',
  criticality: 'Tier 1'
})
CREATE (u_sarah:Identity {
  id: 'usr-0099',
  name: 'sarah.vance@corp.internal',
  type: 'user',
  role: 'Lead SOC Responder',
  criticality: 'Tier 1'
})
CREATE (u_contractor:Identity {
  id: 'usr-contractor-1',
  name: 'dev.contractor1@corp.internal',
  type: 'user',
  role: 'Contract Software Engineer',
  criticality: 'Tier 3'
})
CREATE (sa_data:Identity {
  id: 'svc-acc-db-001',
  name: 'svc-dataplatform@corp.internal',
  type: 'service_account',
  role: 'Data Platform ETL Principal',
  criticality: 'Tier 1'
});

// ── Endpoints ───────────────────────────────────────────────
CREATE (ep_wkstn42:Endpoint {
  id: 'ep-wkstn-0042',
  hostname: 'WKSTN-0042',
  ip: '10.0.1.88',
  os: 'Windows 11 Enterprise',
  criticality: 'Tier 2'
})
CREATE (ep_dev7:Endpoint {
  id: 'ep-dev-007',
  hostname: 'WKSTN-DEV-007',
  ip: '10.50.1.207',
  os: 'Ubuntu 24.04 LTS',
  criticality: 'Tier 3'
})
CREATE (ep_k8s04:Endpoint {
  id: 'ep-k8s-04',
  hostname: 'k8s-node-worker-04',
  ip: '10.0.2.14',
  os: 'Linux (k8s-worker)',
  criticality: 'Tier 2'
});

// ── Services ────────────────────────────────────────────────
CREATE (svc_auth:Service {
  id: 'svc-auth-01',
  name: 'auth-service',
  criticality: 'Tier 1',
  port: 8443,
  sla_tier: 'Mission Critical'
})
CREATE (svc_reporting:Service {
  id: 'svc-reporting-01',
  name: 'svc-customer-reporting',
  criticality: 'Tier 1',
  port: 8080,
  sla_tier: 'Business Critical'
})
CREATE (svc_etl:Service {
  id: 'svc-etl-01',
  name: 'batch-etl-pipeline',
  criticality: 'Tier 2',
  port: 9090,
  sla_tier: 'Standard'
})
CREATE (svc_order:Service {
  id: 'svc-order-01',
  name: 'order-processing-api',
  criticality: 'Tier 1',
  port: 443,
  sla_tier: 'Mission Critical'
});

// ── DataStores ──────────────────────────────────────────────
CREATE (db_users:DataStore {
  id: 'db-users-01',
  name: 'users-postgres',
  type: 'PostgreSQL RDS',
  criticality: 'Tier 1',
  contains_pii: true
})
CREATE (db_analytics:DataStore {
  id: 'db-analytics-01',
  name: 'db-customer-analytics-cluster',
  type: 'ClickHouse Cluster',
  criticality: 'Tier 1',
  contains_pii: false
})
CREATE (s3_pii:DataStore {
  id: 's3-pii-01',
  name: 'prod-user-pii-data',
  type: 'AWS S3 Bucket',
  criticality: 'Tier 1',
  contains_pii: true
});

// ── Network Zones ───────────────────────────────────────────
CREATE (zone_corp:NetworkZone {id: 'zone-corp', name: 'Corporate VPN Subnet', cidr: '10.0.1.0/24'})
CREATE (zone_prod:NetworkZone {id: 'zone-prod', name: 'Production VPC Subnet', cidr: '10.0.2.0/24'})
CREATE (zone_dev:NetworkZone {id: 'zone-dev', name: 'Developer Network Subnet', cidr: '10.50.1.0/24'});

// ── Graph Relationships ─────────────────────────────────────

// Team ownership
CREATE (t_sec)-[:OWNS]->(svc_auth)
CREATE (t_bi)-[:OWNS]->(svc_reporting)
CREATE (t_data)-[:OWNS]->(svc_etl)
CREATE (t_comm)-[:OWNS]->(svc_order)
CREATE (t_platform)-[:OWNS]->(ep_k8s04);

// Identity authentication
CREATE (u_michael)-[:AUTHENTICATED_TO]->(ep_wkstn42)
CREATE (u_contractor)-[:AUTHENTICATED_TO]->(ep_dev7)
CREATE (sa_data)-[:AUTHENTICATED_TO]->(ep_k8s04);

// Endpoint hosting
CREATE (ep_k8s04)-[:HOSTS]->(svc_reporting)
CREATE (ep_k8s04)-[:HOSTS]->(svc_etl)
CREATE (ep_wkstn42)-[:HOSTS]->(svc_auth);

// Service dependencies
CREATE (svc_reporting)-[:DEPENDS_ON]->(svc_auth)
CREATE (svc_order)-[:DEPENDS_ON]->(svc_auth)
CREATE (svc_etl)-[:DEPENDS_ON]->(svc_reporting);

// Service DataStore read/write
CREATE (svc_auth)-[:READS_WRITES]->(db_users)
CREATE (svc_reporting)-[:READS_WRITES]->(db_analytics)
CREATE (sa_data)-[:READS_WRITES]->(s3_pii);

// Endpoint network placement
CREATE (ep_wkstn42)-[:LOCATED_IN]->(zone_corp)
CREATE (ep_k8s04)-[:LOCATED_IN]->(zone_prod)
CREATE (ep_dev7)-[:LOCATED_IN]->(zone_dev);
