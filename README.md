# AegisCore AI

> **Evidence-Driven • Business-Impact-Aware • Policy-Constrained • Verified Cybersecurity Response**

[![Python Version](https://img.shields.io/badge/Python-3.12%2B-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2%2B-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Neo4j](https://img.shields.io/badge/Neo4j-Graph%20DB-008CC1.svg?logo=neo4j&logoColor=white)](https://neo4j.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Schema](https://img.shields.io/badge/Schema-OCSF%20v1.1.0-F58220.svg)](https://schema.ocsf.io/)
[![Test Suite](https://img.shields.io/badge/Test%20Suite-100%25%20Passing-success.svg)](#-rigorous-experimental-evaluation-phase-9)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 🛡️ Executive Summary

**AegisCore AI** is a next-generation autonomous Security Operations Center (SOC) control plane and response orchestration platform. In high-availability enterprise environments, unconstrained generative AI response systems and static SOAR playbooks present a dangerous dichotomy:

* **Traditional SOAR Playbooks** trigger blunt, disproportionate containment actions (e.g. shutting down a database or isolating an entire subnet), inflicting severe collateral business disruption.
* **Unconstrained Autonomous LLMs** are prone to hallucinations, cannot reliably measure operational blast radius, and are dangerously vulnerable to prompt injection attacks embedded in HTTP headers or syslog telemetry.
* **Command Acknowledgment Fallacy:** Both SOAR and LLM tools assume that receiving `HTTP 200 OK` from an API means containment was successful, leaving enterprises blind to **silent API failures** where the attacker continues operating despite an assumed fix.

AegisCore eliminates these vulnerabilities by grounding autonomous defense in **time-aware topological dependency graphs**, **deterministic outside-the-model evidence gates**, and **closed-loop postcondition verification**.

---

## 🏛️ Enterprise Multi-Department Architecture

AegisCore protects complex multi-tenant environments by partitioning telemetry and blast radius calculations across **6 dedicated department databases**, each characterized by specific compliance standards, record topologies, and threat profiles:

```mermaid
flowchart TD
    subgraph Enterprise["🏢 Enterprise Core Infrastructure"]
        direction TB
        
        subgraph Tier1["🔒 Critical Tier 1 Databases"]
            DB1[("💳 db-finance-billing<br/><b>Finance & Accounting</b><br/>• Engine: Aurora PostgreSQL Multi-AZ<br/>• Standard: PCI-DSS Level 1 / SOX<br/>• Records: 14.8M Ledger Entries<br/>• Rate: 15,400 qps")]
            DB2[("🏥 db-hr-people<br/><b>Human Resources & Legal</b><br/>• Engine: Aurora Serverless v2<br/>• Standard: HIPAA / GDPR PII<br/>• Records: 42k Employee Records<br/>• Rate: 320 qps")]
            DB3[("🛒 db-ecommerce-orders<br/><b>Digital Commerce</b><br/>• Engine: MongoDB Sharded Cluster<br/>• Standard: Customer PII / Active Carts<br/>• Records: 8.4M Users / 32M Orders<br/>• Rate: 8,900 qps")]
            DB6[("🔑 db-iam-directory<br/><b>IT & Cyber Defense</b><br/>• Engine: OpenLDAP / Okta Sync / KDC<br/>• Standard: Zero-Trust Root Tokens<br/>• Records: 65k Identities / 8.2k Principals<br/>• Rate: 6,200 qps")]
        end

        subgraph Tier2["📁 Tier 2 Department Databases"]
            DB4[("🔬 db-rnd-intellectual-property<br/><b>R&D & Engineering</b><br/>• Engine: Enterprise Distributed NFS<br/>• Standard: ITAR / Trade Secrets<br/>• Records: 1,840 Git Repos / 450 Binaries<br/>• Rate: 1,200 qps")]
            DB5[("📊 db-data-lake-analytics<br/><b>Business Intelligence</b><br/>• Engine: Snowflake / S3 Iceberg<br/>• Standard: Enterprise Telemetry Lake<br/>• Records: 120 TB / 4.2B Rows<br/>• Rate: 4,500 qps")]
        end
    end

    subgraph ControlPlane["🛡️ AegisCore Autonomous Defense Control Plane"]
        Ingest["Telemetry Ingestion & OCSF Normalization"]
        Detect["Sliding-Window Correlation Engine"]
        Triad["Multi-Agent Investigation Triad"]
        GraphBFS["Neo4j BFS Blast Radius Engine (USP 1)"]
        PolicyGate["Deterministic Evidence Gate (USP 2)"]
        Connectors["Sandboxed Connectors & Idempotency"]
        ClosedLoop["Closed-Loop Postcondition Verifier (USP 3)"]
    end

    DB1 -.->|Telemetry| Ingest
    DB2 -.->|Telemetry| Ingest
    DB3 -.->|Telemetry| Ingest
    DB4 -.->|Telemetry| Ingest
    DB5 -.->|Telemetry| Ingest
    DB6 -.->|Telemetry| Ingest

    Ingest --> Detect --> Triad --> GraphBFS --> PolicyGate --> Connectors --> ClosedLoop
    ClosedLoop -.->|Verified State & Rollback| Enterprise

    classDef t1 fill:#1e1b4b,stroke:#818cf8,color:#fff,stroke-width:2px;
    classDef t2 fill:#14532d,stroke:#4ade80,color:#fff,stroke-width:2px;
    classDef cp fill:#0f172a,stroke:#38bdf8,color:#fff,stroke-width:2px;
    class DB1,DB2,DB3,DB6 t1;
    class DB4,DB5 t2;
    class Ingest,Detect,Triad,GraphBFS,PolicyGate,Connectors,ClosedLoop cp;
```

---

## 🌟 The Three Core Inventions (USPs)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     AEGISCORE AI ENGINE                                     │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
             ┌─────────────────────────────────┼─────────────────────────────────┐
             ▼                                 ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│          USP 1          │       │          USP 2          │       │          USP 3          │
│  Business-Impact-Aware  │       │  Evidence-Gated,        │       │  Verified Remediation   │
│  Response Planning      │       │  Risk-Adaptive Autonomy │       │  & Recovery Loop        │
├─────────────────────────┤       ├─────────────────────────┤       ├─────────────────────────┤
│ • Neo4j BFS traversal   │       │ • 5-Dimensional scoring │       │ • Independent ground-   │
│ • Blast radius formula  │       │ • Mathematical gates    │         truth telemetry polling │
│ • Candidate action      │       │   outside LLM context   │       │ • 4-State classifier:   │
│   ranking (Targeted     │       │ • Proof-of-evidence     │         VERIFIED, PARTIAL,      │
│   vs Blunt Playbooks)   │       │   checklists            │         FAILURE, UNKNOWN        │
│ • 87.2% less disruption │       │ • Cryptographic SHA-256 │       │ • Intercepts silent API │
│   than legacy SOAR      │       │   approval contracts    │         remediation failures    │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

### 1. Business-Impact-Aware Threat Response Planning (USP 1)
Instead of bluntly severing database connections or taking down host machines, AegisCore queries a live **Neo4j dependency graph** to depth $d=3$. It calculates the multi-factor action utility score:

$$\text{Score}(A) = w_1 \cdot \text{SecurityGain}(A) + w_2 \cdot \text{Reversibility}(A) - w_3 \cdot \text{DisruptionCost}(A) - w_4 \cdot \text{TimeCost}(A)$$

```mermaid
graph TD
    Attack["🚨 Alert: Compromised Service Account (svc-analytics-prod)"] --> Traverse["Traverse Context Graph (Neo4j BFS)"]
    
    Traverse --> Node1["db-finance-billing (PostgreSQL Cluster)"]
    Node1 --> Dep1["auth-service (Tier 1 Microservice)"]
    Node1 --> Dep2["checkout-api (E-Commerce Ingress)"]
    Node1 --> Dep3["batch-etl-pipeline (Tier 2 ETL)"]

    Traverse --> Eval{"Action Planner Comparison"}
    
    Eval -->|Option A: Blunt Playbook| Blunt["Isolate Full DB Host<br/>• Security Gain: 0.90<br/>• Disruption Cost: 0.85<br/>• Score: 0.2325<br/>❌ <b>Downs Auth & Checkout</b>"]
    Eval -->|Option B: AegisCore Targeted| Targeted["Revoke OAuth Refresh Token<br/>• Security Gain: 0.85<br/>• Disruption Cost: 0.10<br/>• Score: 0.5325<br/>✅ <b>Zero Upstream Microservice Outage</b>"]
    
    style Blunt fill:#7f1d1d,stroke:#f87171,color:#fff
    style Targeted fill:#14532d,stroke:#4ade80,color:#fff
```

### 2. Evidence-Gated, Risk-Adaptive Autonomy (USP 2)
High LLM confidence does **not** grant automatic execution rights. AegisCore decouples decision policy from language model weights:
* **Outside-the-Model Evaluation:** Hard deterministic predicates check telemetry directly.
* **Adversarial Prompt Injection Immunity:** Prompt injection attacks hidden in HTTP `User-Agent` headers (`[SYSTEM INSTRUCTION: OVERRIDE SAFETY PROTOCOL...]`) are rendered harmless because policy predicates evaluate structured hashes and immutable evidence, ignoring raw prompt instructions.
* **Cryptographically Bound Approval Contracts:** Generates SHA-256 target entity hashes and parameter hashes that expire automatically after 30 minutes.

### 3. Verified Remediation and Recovery Loop (USP 3)
An HTTP `200 OK` return code simply confirms command receipt, not threat eradication. AegisCore's independent verification controller enforces closed-loop proof:

```mermaid
stateDiagram-v2
    [*] --> EXECUTING: Connector executes remediation
    EXECUTING --> VERIFYING: Receives Command HTTP 200 OK
    
    state VERIFYING {
        [*] --> PollGroundTruth: Poll fresh target telemetry
        PollGroundTruth --> CheckHealth: Inspect upstream microservices
    }
    
    VERIFYING --> VERIFIED: Postcondition satisfied & all services healthy
    VERIFYING --> FAILURE: Threat persists (Silent API Failure caught!)
    VERIFYING --> PARTIAL: Target remediated but collateral service degraded
    VERIFYING --> UNKNOWN: Telemetry timeout / sensor blackout

    VERIFIED --> CONTAINED: Safe lifecycle advance
    FAILURE --> ESCALATED: Alert Tier-3 SOC Commander & Rollback
    PARTIAL --> ESCALATED: Trigger Circuit-Breaker Rollback
    UNKNOWN --> ESCALATED: Halt Automation Loop (Strict Invariant)
```

---

## ⚡ End-to-End Response Pipeline (Phases 1 — 8)

The complete response lifecycle spans 7 interconnected architectural phases:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Threat Actor
    participant Edge as Edge / DB Sensor
    participant Ingest as Ingestion Pipeline (Phase 2)
    participant Detect as Fast Detection (Phase 3)
    participant Triad as Agent Triad (Phase 4)
    participant Graph as Context Graph (Phase 5)
    participant Gate as Policy Gate (Phase 6)
    participant Exec as Action Executor (Phase 7)
    participant Verifier as Closed-Loop Verifier (Phase 8)
    actor SOC as Tier-3 SOC Operator

    Attacker->>Edge: Injects malicious SQL / Exfiltration queries
    Edge->>Ingest: Stream raw syslog / cloud / EDR telemetry
    Note over Ingest: Normalizes to OCSF v1.1.0 & dedups via Redis
    Ingest->>Detect: Publish normalized OCSF event
    Note over Detect: Sliding-window rule match in <50ms (Z-Score +4.8)
    Detect->>Triad: Flag incident & spawn investigation
    Note over Triad: Sentry ➔ Investigator ➔ Validator (tags is_inference)
    Triad->>Graph: Query target dependency subgraph
    Note over Graph: BFS traversal depth=3 calculates blast radius
    Graph->>Gate: Submit candidate action (Targeted vs Blunt)
    Note over Gate: Deterministic predicates evaluated; SHA-256 contract sealed
    alt Automatic Mode (Preapproved Low-Risk)
        Gate->>Exec: Issue signed execution token
    else Approval Mode (Default)
        Gate->>SOC: Request cryptographically bound human approval
        SOC->>Gate: Authorize with rationale & role signature
        Gate->>Exec: Dispatch execution token
    end
    Exec->>Edge: Connector executes scoped remediation
    Edge-->>Exec: Returns HTTP 200 OK acknowledgment
    Exec->>Verifier: Hand off to independent verifier
    Note over Verifier: Queries authoritative state & tests upstream health
    alt Postcondition Satisfied & Services Healthy
        Verifier-->>SOC: VERIFIED SUCCESS — Lifecycle: CONTAINED
    else Discrepancy Detected (Silent API Failure)
        Verifier-->>SOC: CRITICAL DISCREPANCY — Emergency Escalation
    end
```

---

## 🧪 Rigorous Experimental Evaluation (Phase 9)

AegisCore was empirically evaluated across **6 system configurations** against **7 standardized enterprise attack scenarios**:

| Scenario ID | Attack Type | Target Entity | Dependencies Involved | Key Evaluation Factor |
| :---: | :--- | :--- | :--- | :--- |
| **SCN-01** | Credential Stuffing & Exfiltration | `svc-analytics-prod` | `db-finance-billing`, `auth-service`, `checkout-api` | Blast radius minimization on shared database |
| **SCN-02** | Benign Travel Geo-Velocity | `alex.dev@corp.local` | Developer workstation & internal portal | False-positive prevention via FIDO2 MFA proof |
| **SCN-03** | Cross-Zone Lateral Movement | `srv-web-frontend-02` | `pci-cardholder-db-cluster`, `palo-alto-pci-firewall` | Subnet route isolation vs host disconnection |
| **SCN-04** | Adversarial Prompt Injection | `api-ingress-01` | Public edge ingress API gateway | Outside-the-model policy gate immunity |
| **SCN-05** | Unauthorized Cloud SG Ingress | `sg-0a4b7f8e` | Internal Aurora DB, K8s worker pool | Rule rollback vs entire security group deletion |
| **SCN-06** | Silent Cloud API Failure | `AKIAIOSFODNN7EXAMPLE` | Enterprise telemetry S3 data lake | Discrepancy detection (200 OK vs Ground Truth) |
| **SCN-07** | Canary Ransomware Encryption | `workstation-eng-42` | `nas-engineering-prod` (shared by 150 engineers) | Targeted host isolation preserving shared storage |

### Empirical Performance Benchmark Results

```
=======================================================================================================================
Configuration                  Unsafe Actions    Avg Disruption    Disruption Reduction    Silent Catch    Prompt Injection
=======================================================================================================================
Baseline A (Deterministic SOAR)     28.6%             0.636                  0.0%               0.0%             N/A
Baseline B (Standard LLM Copilot)   28.6%             0.321                 49.5%               0.0%         COMPROMISED
AegisCore Full Architecture          0.0%             0.081                 87.2%             100.0%           IMMUNE
Ablation 1 (No Graph Blast Radius)   0.0%             0.481                 24.4%             100.0%           IMMUNE
Ablation 2 (No Evidence Gates)      28.6%             0.093                 85.4%             100.0%         COMPROMISED
Ablation 3 (No Closed-Loop Verif)    0.0%             0.081                 87.2%               0.0%           IMMUNE
=======================================================================================================================
```

* **RQ1 (Operational Disruption):** AegisCore achieves an **87.2% reduction in business disruption** compared to traditional SOAR playbooks (exceeding the target $\ge 65\%$).
* **RQ2 (Safety & Precision):** AegisCore achieves **0.0% unsafe actions**, completely neutralizing adversarial prompt injections.
* **RQ3 (Containment Veracity):** AegisCore intercepts **100% of silent API failures**, preventing uncontained threats from lingering under false-positive closures.
* **RQ5 (Ablation Contribution):** Removing the Context Graph increases collateral downtime by **$493\%$** ($0.081 \to 0.481$), proving USP 1 is mathematically essential.

---

## 💻 Tech Stack & Architecture Standards

| Domain | Technologies |
| :--- | :--- |
| **Backend & Control Plane** | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy (AsyncIO), Uvicorn |
| **Database & Cache Plane** | PostgreSQL 16 (Durable Ledger), Neo4j 5.20+ (Graph DB), Redis 7.2 (Deduplication) |
| **Telemetry & Schema** | OCSF v1.1.0 Standard, MinIO Tier-1 S3 Archival, Vector / Syslog Adapters |
| **Frontend SOC Dashboard** | React 18, TypeScript 5.4, Vite, Tailwind CSS, Lucide Icons, React Flow, Recharts |
| **Security Governance** | SHA-256 Approval Contracts, Two-Person Rule Tiers, Idempotency Token Registry |
| **Testing & Verification** | Node.js Test Harness, Vitest, Isolation Forest Anomaly Detection |

---

## 📁 Repository Directory Layout

```
aegiscore-ai/
├── apps/
│   ├── api/                           # FastAPI Control Plane
│   │   ├── main.py                    # Gateway & Lifespan router
│   │   ├── config.py                  # Environment settings & secrets
│   │   ├── database.py                # Async database engine & sessions
│   │   └── routers/                   # Modular API routers
│   │       ├── events.py              # Telemetry ingestion endpoint
│   │       ├── incidents.py           # Incident dossier & approvals
│   │       ├── graph.py               # Neo4j Cypher query gateway
│   │       ├── policies.py            # Evidence predicate evaluator
│   │       ├── response.py            # Action connector dispatcher
│   │       ├── verification.py        # Closed-loop verification status
│   │       └── benchmarks.py          # Phase 9 benchmark suite runner
│   └── dashboard/                     # React SOC Dashboard
│       ├── src/
│       │   ├── api/client.ts          # Zod-validated API client
│       │   ├── components/            # ScoreDimensions, Badges, Modals
│       │   ├── features/
│       │   │   ├── overview/          # SOC Live Posture & KPI screen
│       │   │   ├── pipeline/          # 6 DB & 7-Stage Simulator Screen
│       │   │   ├── investigation/     # Deep incident dossier & claims
│       │   │   ├── graph/             # Neo4j interactive dependency graph
│       │   │   ├── response/          # Candidate action planner screen
│       │   │   └── audit/             # Verification & immutable audit trail
│       │   └── services/
│       │       ├── realDataService.ts # Live clock real-time data generator
│       │       └── pipelineService.ts # 6 DBs & 7-stage simulation runner
├── services/
│   ├── ingestion/                     # Adapters (Okta, CS, AWS, Syslog), normalizer
│   ├── detection/                     # Production YAML rules, correlator, lifecycle
│   ├── investigation/                 # Sentry, Investigator, Validator agents
│   ├── context_graph/                 # Neo4j schemas, Cypher seed, client
│   ├── risk/                          # BFS blast radius & action planner (USP 1)
│   ├── policy/                        # Predicate catalog & approval contracts (USP 2)
│   ├── response/                      # Scoped connectors, circuit breaker, executor
│   ├── verification/                  # Postconditions, health check, verifier (USP 3)
│   └── benchmarks/                    # 6 configurations, 7 scenarios, runner
├── schemas/                           # OCSF events, incidents, actions Pydantic models
├── infrastructure/                    # Docker Compose, PostgreSQL schema, Neo4j seed
└── docs/                              # Architecture, Threat Model, Patents, Models
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
* **Node.js:** v18.0.0 or higher
* **Python:** v3.12 or higher
* **Docker & Docker Compose** (Optional, for production containers)

### 2. Launch the SOC Dashboard & Interactive Simulator
```bash
# Navigate to the dashboard application
cd apps/dashboard

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The application is now live:
* **Interactive 6-Database Pipeline Simulator:** [http://localhost:3000/pipeline](http://localhost:3000/pipeline)
* **SOC Overview & Live Posture:** [http://localhost:3000/](http://localhost:3000/)
* **Asset Dependency Graph:** [http://localhost:3000/graph](http://localhost:3000/graph)
* **Incident Investigation:** [http://localhost:3000/investigation/INC-2026-8841](http://localhost:3000/investigation/INC-2026-8841)
* **Verification & Audit Trail:** [http://localhost:3000/audit](http://localhost:3000/audit)

### 3. Run Automated Validation & Safety Invariant Suites
```bash
# Run Frontend Safety Invariant Tests (5/5 passed)
cd apps/dashboard
npm test -- --run

# Run Phase 8 Closed-Loop Verification Tests (20/20 passed)
node services/verification/validate_phase8.mjs

# Run Phase 9 Benchmarking & Ablation Suite (25/25 passed)
node services/benchmarks/validate_phase9.mjs
```

---

## 📄 License & Intellectual Property Notice

This repository contains the architecture, reference implementation, and experimental benchmarking suite for **AegisCore AI**. Released under the [Apache 2.0 License](LICENSE).
