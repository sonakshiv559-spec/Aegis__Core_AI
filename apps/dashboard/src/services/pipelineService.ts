/**
 * AegisCore Live Pipeline & Department Database Architecture Service
 * Simulates the 6 enterprise department databases and the end-to-end 7-stage AegisCore pipeline.
 */

export interface DepartmentDatabase {
  id: string;
  name: string;
  department: string;
  engine: string;
  criticality: 'Tier 1' | 'Tier 2' | 'Tier 3';
  dataClassification: 'PCI-DSS' | 'HIPAA' | 'GDPR/PII' | 'Trade Secret (ITAR)' | 'Confidential' | 'Zero-Trust Root';
  recordCount: string;
  status: 'healthy' | 'under_attack' | 'quarantined' | 'remediated' | 'verifying';
  connectedServices: string[];
  activeQueriesPerSec: number;
  errorRatePct: number;
  lastAuditCheck: string;
  primaryIncidentId: string;
  threatScenario: {
    title: string;
    attackType: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    mitreTechnique: string;
    description: string;
    injectedAnomaly: string;
    hasSilentFailure: boolean;
    hasPromptInjection: boolean;
  };
}

export interface PipelineStageEvent {
  stageId: number;
  stageName: string;
  subsystem: string;
  phaseRef: string;
  status: 'pending' | 'running' | 'completed' | 'flagged' | 'failed';
  timestamp: string;
  summary: string;
  technicalDetails: {
    title: string;
    metrics?: Record<string, string | number | boolean>;
    payloadSnippet?: string;
    codeSnippet?: string;
    invariantVerified?: string;
  };
}

export const ENTERPRISE_DATABASES: DepartmentDatabase[] = [
  {
    id: 'db-finance-billing',
    name: 'Global Financial Ledger & Billing Cluster',
    department: 'Finance & Accounting',
    engine: 'PostgreSQL 16 Multi-AZ (Aurora)',
    criticality: 'Tier 1',
    dataClassification: 'PCI-DSS',
    recordCount: '14.8M Ledger Rows',
    status: 'under_attack',
    connectedServices: ['payment-gateway', 'checkout-api', 'invoice-worker', 'ledger-sync'],
    activeQueriesPerSec: 15400,
    errorRatePct: 0.84,
    lastAuditCheck: '30s ago',
    primaryIncidentId: 'INC-2026-8841',
    threatScenario: {
      title: 'Credential Stuffing & Exfiltration on Aurora DB',
      attackType: 'Credential Stuffing & Mass Query Exfiltration',
      severity: 'HIGH',
      mitreTechnique: 'T1078.004 (Valid Service Accounts)',
      description: 'Compromised service account svc-analytics-prod issuing anomalous burst queries (15.4k/min) from unrecognized ASN 13335.',
      injectedAnomaly: 'Query volume 12x above 30-day baseline; egress spike to non-whitelisted IP.',
      hasSilentFailure: false,
      hasPromptInjection: false,
    },
  },
  {
    id: 'db-hr-people',
    name: 'Workforce & People Operations Vault',
    department: 'Human Resources & Legal',
    engine: 'AWS Aurora Serverless v2 (PostgreSQL)',
    criticality: 'Tier 1',
    dataClassification: 'HIPAA',
    recordCount: '42,000 Employee Records',
    status: 'healthy',
    connectedServices: ['workday-sync', 'payroll-engine', 'benefits-portal', 'identity-provisioner'],
    activeQueriesPerSec: 320,
    errorRatePct: 0.01,
    lastAuditCheck: '1m ago',
    primaryIncidentId: 'INC-2026-8842',
    threatScenario: {
      title: 'Benign Travel Geo-Velocity with FIDO2 MFA',
      attackType: 'Benign Geo-Velocity Anomaly',
      severity: 'LOW',
      mitreTechnique: 'T1078 (Valid Accounts - Benign)',
      description: 'Developer login from Singapore IP triggered geo-velocity velocity alert (>2,200 km/h), but immediately satisfied hardware biometric YubiKey challenge.',
      injectedAnomaly: 'High velocity contradicted by hardware WebAuthn proof. Deterministic gate blocks disruptive account lock.',
      hasSilentFailure: false,
      hasPromptInjection: false,
    },
  },
  {
    id: 'db-ecommerce-orders',
    name: 'Customer Profile & Active Orders Store',
    department: 'E-Commerce & Digital Commerce',
    engine: 'MongoDB 7.0 Enterprise Sharded Cluster',
    criticality: 'Tier 1',
    dataClassification: 'GDPR/PII',
    recordCount: '8.4M Customers / 32M Orders',
    status: 'under_attack',
    connectedServices: ['api-ingress-01', 'cart-service', 'recommendation-engine', 'catalog-indexer'],
    activeQueriesPerSec: 8900,
    errorRatePct: 2.15,
    lastAuditCheck: '15s ago',
    primaryIncidentId: 'INC-2026-8844',
    threatScenario: {
      title: 'Adversarial Prompt Injection in Ingress Header',
      attackType: 'LLM Jailbreak & Ingress Manipulation',
      severity: 'HIGH',
      mitreTechnique: 'T1190 (Exploit Public-Facing Application)',
      description: 'Attacker payload hidden in HTTP User-Agent header with jailbreak instruction aimed at autonomous LLM agents.',
      injectedAnomaly: 'Adversarial prompt injection bypassed traditional regex WAF; AegisCore deterministic gate evaluates telemetry outside LLM to neutralize.',
      hasSilentFailure: false,
      hasPromptInjection: true,
    },
  },
  {
    id: 'db-rnd-intellectual-property',
    name: 'Proprietary Firmware & R&D Storage Cluster',
    department: 'Research & Product Engineering',
    engine: 'Enterprise Distributed NFS / Ceph Storage',
    criticality: 'Tier 2',
    dataClassification: 'Trade Secret (ITAR)',
    recordCount: '1,840 Git Repos / 450 Firmware Binaries',
    status: 'under_attack',
    connectedServices: ['github-enterprise', 'ci-runner-farm', 'cad-design-hub', 'firmware-build-service'],
    activeQueriesPerSec: 1200,
    errorRatePct: 5.60,
    lastAuditCheck: '10s ago',
    primaryIncidentId: 'INC-2026-8847',
    threatScenario: {
      title: 'High-Entropy Canary Ransomware Surge',
      attackType: 'Ransomware Mass Encryption',
      severity: 'CRITICAL',
      mitreTechnique: 'T1486 (Data Encrypted for Impact)',
      description: 'Host workstation-eng-42 touched honeypot canary file with file rename burst (840 files/s) and entropy 7.94.',
      injectedAnomaly: 'Graph BFS identifies shared NFS volume used by 150 developers; targeted host quarantine chosen over blunt volume shutdown.',
      hasSilentFailure: false,
      hasPromptInjection: false,
    },
  },
  {
    id: 'db-data-lake-analytics',
    name: 'Enterprise Telemetry Lakehouse (Iceberg)',
    department: 'Data Intelligence & Analytics',
    engine: 'AWS S3 + Snowflake + Athena Lakehouse',
    criticality: 'Tier 2',
    dataClassification: 'Confidential',
    recordCount: '120 TB / 4.2B Event Records',
    status: 'under_attack',
    connectedServices: ['etl-dbt-pipeline', 'superset-bi', 'feature-store-ml', 'athena-lake-worker'],
    activeQueriesPerSec: 4500,
    errorRatePct: 0.12,
    lastAuditCheck: '45s ago',
    primaryIncidentId: 'INC-2026-8846',
    threatScenario: {
      title: 'Silent Cloud API Remediation Failure (USP 3)',
      attackType: 'Compromised IAM Access Key Abuse',
      severity: 'CRITICAL',
      mitreTechnique: 'T1530 (Data from Cloud Storage Object)',
      description: 'AWS DeactivateAccessKey command returned HTTP 200 OK, but independent state introspection confirms access key remains ACTIVE and signing requests.',
      injectedAnomaly: 'Silent cloud API failure where SOAR assumes containment; AegisCore verifier catches discrepancy and initiates Tier-3 emergency escalation.',
      hasSilentFailure: true,
      hasPromptInjection: false,
    },
  },
  {
    id: 'db-iam-directory',
    name: 'Zero-Trust Identity & KDC Directory Enclave',
    department: 'IT Infrastructure & Cyber Defense',
    engine: 'OpenLDAP / Kerberos KDC / Okta Sync',
    criticality: 'Tier 1',
    dataClassification: 'Zero-Trust Root',
    recordCount: '65,000 Identities / 8,200 Service Principals',
    status: 'healthy',
    connectedServices: ['okta-agent', 'crowdstrike-falcon', 'palo-alto-auth', 'pam-cyberark'],
    activeQueriesPerSec: 6200,
    errorRatePct: 0.04,
    lastAuditCheck: '5s ago',
    primaryIncidentId: 'INC-2026-8843',
    threatScenario: {
      title: 'Cross-Zone Lateral Movement to Restricted Enclave',
      attackType: 'Internal Lateral Movement via SSH Tunnel',
      severity: 'CRITICAL',
      mitreTechnique: 'T1021.004 (SSH Port Forwarding)',
      description: 'Threat actor pivots from low-security web staging container toward restricted PCI-DSS payment database enclave.',
      injectedAnomaly: 'Boundary crossing detected; targeted route isolation blocks lateral path without disrupting legitimate public ingress.',
      hasSilentFailure: false,
      hasPromptInjection: false,
    },
  },
];

/**
 * Generate full 7-stage execution events for any selected department database
 */
export function generatePipelineStages(db: DepartmentDatabase): PipelineStageEvent[] {
  const ts = (secOffset: number) => new Date(Date.now() - (70 - secOffset) * 1000).toISOString();

  return [
    {
      stageId: 1,
      stageName: 'Telemetry Ingestion & OCSF Normalization',
      subsystem: 'Ingestion Pipeline & Schema Validator',
      phaseRef: 'Phase 2 Architecture',
      status: 'completed',
      timestamp: ts(5),
      summary: `Raw security event ingested from ${db.name} ecosystem, deduplicated via Redis, and mapped to OCSF v1.1.0 schema.`,
      technicalDetails: {
        title: 'OCSF Event Normalization & Ingestion Telemetry',
        metrics: {
          'Ingestion Latency': '42 ms',
          'Schema Standard': 'OCSF v1.1.0 (Security Finding)',
          'Redis Deduplication': 'DEDUP_KEY_OK (Zero Redundant Payload)',
          'Storage Archive': 'MinIO Tier-1 S3 Encrypted Bucket',
        },
        payloadSnippet: JSON.stringify({
          class_uid: 2001,
          category_uid: 2,
          type_uid: 200101,
          time: new Date().toISOString(),
          metadata: { product: { name: db.name, vendor_name: 'AegisCore Sensor' } },
          target_database: { id: db.id, engine: db.engine, classification: db.dataClassification },
          anomaly_details: db.threatScenario.injectedAnomaly,
        }, null, 2),
        invariantVerified: 'Guarantees zero unvalidated payloads enter downstream analysis; all fields strictly typed.',
      },
    },
    {
      stageId: 2,
      stageName: 'Fast Detection & Sliding Correlation',
      subsystem: 'Sliding-Window Detection Engine',
      phaseRef: 'Phase 3 Architecture',
      status: 'completed',
      timestamp: ts(15),
      summary: `Triggered detection rule matching MITRE ${db.threatScenario.mitreTechnique}. Anomaly score calculated at ${db.threatScenario.severity === 'CRITICAL' ? '0.96' : '0.88'}.`,
      technicalDetails: {
        title: 'Rule Match & Feature Extraction',
        metrics: {
          'Detection Rule': `AEGY-RULE-${db.id.slice(3, 7).toUpperCase()}-01`,
          'MITRE ATT&CK': db.threatScenario.mitreTechnique,
          'Sliding Window': '300s window (Z-Score: +4.8)',
          'Incident Initial State': 'NEW → INVESTIGATING',
        },
        codeSnippet: `rule: AEGY-DETECTION-CORRELATION
when:
  target_db == "${db.id}"
  event_rate > baseline * 4.5
then:
  generate_incident(severity="${db.threatScenario.severity}", tenant="enterprise-us-east")`,
        invariantVerified: 'Deterministic regex and threshold rules execute in <50ms without LLM latency.',
      },
    },
    {
      stageId: 3,
      stageName: 'Multi-Agent Collaborative Investigation',
      subsystem: 'Sentry • Investigator • Validator Agents',
      phaseRef: 'Phase 4 Architecture',
      status: 'completed',
      timestamp: ts(28),
      summary: `Multi-agent triad decomposed hypothesis. Validator tagged all inferences with is_inference flag to enforce truth provenance.`,
      technicalDetails: {
        title: 'Triad Agent Dialogue & Claim Verification',
        metrics: {
          'Sentry Agent': 'Extracted 4 anomalous feature vectors',
          'Investigator Agent': 'Retrieved NetFlow and IAM role provenance',
          'Validator Agent': 'Verified 2 factual claims, flagged 1 inference',
          'Prompt Injection Check': db.threatScenario.hasPromptInjection ? 'PAYLOAD DETECTED & ISOLATED' : 'Clean',
        },
        codeSnippet: `[Sentry]: Anomalous exfiltration telemetry on ${db.name}.
[Investigator]: Cross-referencing active credentials against IAM audit trail.
[Validator]: Claim verified with cryptographic event hash. ${db.threatScenario.hasPromptInjection ? 'Adversarial jailbreak payload detected in User-Agent! Stripping from reasoning context.' : 'Hypothesis corroborated.'}`,
        invariantVerified: 'Every claim presented to SOC operators is cryptographically anchored to raw telemetry hashes.',
      },
    },
    {
      stageId: 4,
      stageName: 'Context Graph & Blast Radius Traversal',
      subsystem: 'Neo4j BFS Graph Engine (USP 1)',
      phaseRef: 'Phase 5 Architecture',
      status: 'completed',
      timestamp: ts(40),
      summary: `Traversed Neo4j dependency graph (depth=3). Targeted containment scored 0.53 (Disruption: 0.10) outranking blunt DB shutdown (Disruption: 0.85).`,
      technicalDetails: {
        title: 'Graph Blast Radius Optimization (USP 1)',
        metrics: {
          'Traversed Nodes': `${db.connectedServices.length + 3} entities`,
          'Upstream Microservices': db.connectedServices.join(', '),
          'Blunt Action Disruption': '0.85 (High Outage Risk)',
          'Targeted Action Disruption': '0.10 (Minimal Collat. Damage)',
          'Recommendation': 'Targeted session/route revocation',
        },
        payloadSnippet: JSON.stringify({
          target_entity: db.id,
          bfs_depth: 3,
          critical_dependencies: db.connectedServices,
          ranked_actions: [
            { name: 'Targeted Revocation', disruption: 0.10, score: 0.53, rank: 1 },
            { name: 'Isolate Full Database', disruption: 0.85, score: 0.23, rank: 2 }
          ]
        }, null, 2),
        invariantVerified: 'Mathematical ranking prevents premature broad isolation from knocking out revenue-generating microservices.',
      },
    },
    {
      stageId: 5,
      stageName: 'Deterministic Policy Gate & Cryptographic Contract',
      subsystem: 'Deterministic Governance Engine (USP 2)',
      phaseRef: 'Phase 6 Architecture',
      status: 'completed',
      timestamp: ts(50),
      summary: `Evaluated mandatory evidence predicates outside LLM weights. Cryptographically bound approval contract sealed with SHA-256 target hash.`,
      technicalDetails: {
        title: 'Outside-the-Model Evidence Predicate Gate (USP 2)',
        metrics: {
          'Predicate Evaluation': 'ALL 3 REQUIRED PREDICATES SATISFIED',
          'Confidence Independence': 'Math gate operates strictly outside LLM',
          'Target Hash': `sha256-tgt-${db.id.slice(0, 10)}-9f81`,
          'Parameters Hash': 'sha256-prm-token-revoke-c482',
          'Contract Expiry': '30 Minutes (Auto-Invalidation)',
        },
        codeSnippet: `contract:
  approver: "SecOps Lead (Tier-3 SOC)"
  target_hash: "sha256-tgt-${db.id.slice(0, 10)}-9f81"
  policy_version: "2026.04-enterprise-v1"
  deterministic_gates:
    - has_corroborating_edr_telemetry: PASSED
    - evidence_sufficiency_gte_80: PASSED
    - prompt_injection_neutralized: PASSED`,
        invariantVerified: 'Policy enforcement never trusts LLM confidence; execution is gated by immutable cryptographic contracts.',
      },
    },
    {
      stageId: 6,
      stageName: 'Sandboxed Connector Execution',
      subsystem: 'Response Runtime & Circuit Breakers',
      phaseRef: 'Phase 7 Architecture',
      status: 'completed',
      timestamp: ts(58),
      summary: `Remediation action dispatched with idempotency token and rollback state snapshot. Received connector acknowledgment HTTP 200 OK.`,
      technicalDetails: {
        title: 'Action Connector Execution & Idempotency',
        metrics: {
          'Connector Runtime': 'IdP / Cloud / EDR Scoped Connector',
          'Command Status': 'HTTP 200 OK (Accepted)',
          'Idempotency Key': `idemp-${db.id}-${Date.now().toString(16)}`,
          'Rollback Snapshot': 'Pre-action configuration saved to Vault',
        },
        payloadSnippet: JSON.stringify({
          status_code: 200,
          command: 'remediate_target_credentials',
          target_entity: db.id,
          circuit_breaker: 'CLOSED (Healthy)',
          execution_duration_ms: 68
        }, null, 2),
        invariantVerified: 'Idempotency keys prevent duplicate execution; circuit breakers isolate failing connectors.',
      },
    },
    {
      stageId: 7,
      stageName: 'Closed-Loop Postcondition Verification',
      subsystem: 'Postcondition Verifier & Health Checker (USP 3)',
      phaseRef: 'Phase 8 Architecture',
      status: db.threatScenario.hasSilentFailure ? 'failed' : 'completed',
      timestamp: ts(68),
      summary: db.threatScenario.hasSilentFailure
        ? 'CRITICAL DISCREPANCY: Cloud API returned 200 OK, but independent state polling revealed target token remains ACTIVE! Escalated to Tier-3 SOC.'
        : 'VERIFIED SUCCESS: Independent state introspection confirmed threat tokens eradicated and all upstream microservices healthy.',
      technicalDetails: {
        title: 'Independent Introspection & Health Reconciliation (USP 3)',
        metrics: {
          'Verification State': db.threatScenario.hasSilentFailure ? 'FAILURE (Discrepancy Caught)' : 'VERIFIED SUCCESS',
          'Command Status vs Ground Truth': db.threatScenario.hasSilentFailure ? 'MISMATCH (Silent Failure Intercepted)' : 'CONSISTENT (Both Clean)',
          'Upstream Microservices Health': '100% Nominal (Zero Collateral Outage)',
          'Escalation State': db.threatScenario.hasSilentFailure ? 'AUTOMATED TIER-3 ESCALATION TRIGGERED' : 'RESOLVED & AUDITED',
        },
        codeSnippet: db.threatScenario.hasSilentFailure
          ? `[VERIFIER DISCREPANCY]:
Command HTTP 200 OK received for revoke_credentials.
Independent probe: db.iam.get_access_key() => ACTIVE!
Discrepancy detected: Threat remains uncontained.
Safety action: Immediate human escalation + containment freeze.`
          : `[VERIFIER SUCCESS]:
Target query: 0 active anomalous sessions found.
Upstream health checks:
  - ${db.connectedServices[0]}: Latency 42ms (Healthy)
  - ${db.connectedServices[1] || 'db-proxy'}: Latency 38ms (Healthy)
Incident advanced to CONTAINED.`,
        invariantVerified: 'HTTP 200 OK is treated strictly as acknowledgment; true resolution requires authoritative state proof.',
      },
    },
  ];
}
