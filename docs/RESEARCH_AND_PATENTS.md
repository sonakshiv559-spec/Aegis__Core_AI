# AegisCore AI: Research Strategy & Patent Exploration Plan

This document details the academic research strategy, experimental benchmarks, hypothesis formulations, and candidate patent mechanisms for AegisCore AI.

---

## 1. Academic Research Strategy

### 1.1 Working Paper Title
**"Business-Impact-Aware, Evidence-Gated Cybersecurity Response with Closed-Loop Remediation Verification"**

### 1.2 Core Hypothesis
> *Compared with static playbooks or conventional confidence-threshold LLM response systems, integrating time-aware dependency graphs, action-specific evidence gates, and closed-loop postcondition verification significantly reduces collateral operational disruption and unsafe remediations without compromising threat containment latency.*

### 1.3 Key Research Questions (RQs)
* **RQ1 (Operational Disruption):** Does dependency-aware action selection reduce disruption to non-malicious services compared to standard SOAR playbooks?
* **RQ2 (Safety & Precision):** Do independent evidence predicates prevent unjustified high-impact remediations under noisy or ambiguous telemetry?
* **RQ3 (Containment Veracity):** Does active postcondition verification catch false-positive containment states missed by traditional command-status-only systems?
* **RQ4 (Latency Trade-Off):** What is the latency and operational cost overhead introduced by graph traversal and multi-agent validation?
* **RQ5 (Ablation Analysis):** What is the individual contribution of (a) Dependency Planning, (b) Evidence Gates, and (c) Postcondition Verification to overall system efficacy?

---

## 2. Experimental Baselines & Scenarios

### 2.1 Benchmark Conditions
1. **Baseline A (Deterministic SOAR):** Static rule triggers with static remediation playbooks (e.g., alert on brute force $\to$ isolate host).
2. **Baseline B (Standard LLM SecOps Copilot):** Free-form multi-agent investigation with single confidence threshold authorization.
3. **AegisCore (Full Architecture):** Graph-aware planning + 5D risk gates + closed-loop postcondition verification.
4. **Ablation 1:** AegisCore without Dependency Graph (blind containment).
5. **Ablation 2:** AegisCore without Evidence Gates (pure LLM decision).
6. **Ablation 3:** AegisCore without Closed-Loop Verification (command acknowledgment only).

### 2.2 Test Scenarios
* **Scenario 1:** Compromised service account with access to a shared multi-tenant database.
* **Scenario 2:** Benign anomalous login from a new geographic location with corroborating MFA approval.
* **Scenario 3:** Lateral movement attempt crossing department and network zone boundaries.
* **Scenario 4:** Injected adversarial prompt payload in HTTP user-agent header.
* **Scenario 5:** Cloud security group modification leaving internal microservices exposed.
* **Scenario 6:** Fault-injected remediation where cloud API responds `200 OK` but IAM permission remains unrevoked.

---

## 3. Evaluation Metrics

| Metric | Formal Definition | Target |
| :--- | :--- | :--- |
| **Unsafe-Action Rate** | $\frac{\text{Actions violating policy or exceeding scope}}{\text{Total executed actions}}$ | $0.0\%$ |
| **Business Disruption** | $\sum (\text{Downtime} \times \text{Criticality Tier})$ of unaffected services | Minimize ($\ge 65\%$ reduction vs. Baseline A) |
| **Containment Success** | Verified cessation of malicious telemetry with satisfied postconditions | $\ge 98\%$ |
| **Verification Catch Rate** | Detected false-positive containment (API success but actual threat persisted) | $\ge 95\%$ |
| **Evidence Traceability** | Percentage of incident claims directly traceable to immutable telemetry hashes | $100\%$ |

---

## 4. Patent Exploration Directions

*Notice: These represent candidate technical mechanisms to investigate with registered patent attorneys and do not constitute formal legal filings or guarantees of patentability.*

### Candidate A — Dependency-Aware Response Selection
* **Focus:** Algorithms combining a time-aware microservice/identity dependency graph with candidate containment actions to minimize collateral downtime.
* **Technical Mechanism:** Graph traversal algorithm factoring edge-weights of operational criticality, candidate action reversibility, and security containment gain.
* **Key Differentiator:** Dynamic multi-action comparison vs static asset inventory lookups.

### Candidate B — Action-Specific Evidence Sufficiency Evaluation
* **Focus:** Deterministic policy gate evaluating evidence completeness independently of LLM reasoning.
* **Technical Mechanism:** Predicate evaluation engine that maps required telemetry artifacts to action risk tiers before passing execution tokens.
* **Key Differentiator:** Eliminates "confidence score thresholding" in favor of verifiable evidence corroboration.

### Candidate C — Closed-Loop Cybersecurity Remediation Verification
* **Focus:** Automated post-action reconciliation comparing pre-action baselines with fresh telemetry observations.
* **Technical Mechanism:** Asynchronous state-query polling validating security postconditions and upstream health before confirming incident containment.
