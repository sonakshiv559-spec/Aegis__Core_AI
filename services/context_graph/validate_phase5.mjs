/**
 * AegisCore AI – Phase 5 Context Graph & Blast Radius Validation
 * 
 * Tests:
 * 1. Graph Topology: Nodes, Edges, Criticality Tiers & React Flow export
 * 2. BFS Graph Traversal: Blast radius calculation across user, endpoint, and service nodes
 * 3. USP 1 Proof: Dependency-aware action scoring & ranking formula
 *    Demonstrates targeted RevokeUserSession > broad IsolateEndpoint due to disruption cost.
 */

console.log('\n' + '='.repeat(68));
console.log('  AegisCore Phase 5 – Context Graph & Blast Radius Validation (USP 1)');
console.log('='.repeat(68) + '\n');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    totalPassed++;
  } else {
    console.log(`  ✗ FAILED: ${message}`);
    totalFailed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 1: Graph Topology & Criticality Tiers
// ─────────────────────────────────────────────────────────────────────────────
console.log('📋 Test Group 1: Graph Topology & Criticality Tiers');

const enterpriseNodes = [
  { id: 'usr-0042', label: 'michael.chen@corp.internal', type: 'identity', criticality: 'Tier 1', owner: 'Data Eng' },
  { id: 'svc-acc-db-001', label: 'svc-dataplatform@corp.internal', type: 'identity', criticality: 'Tier 1', owner: 'Data Platform' },
  { id: 'usr-contractor-1', label: 'dev.contractor1@corp.internal', type: 'identity', criticality: 'Tier 3', owner: 'Consulting' },
  { id: 'ep-wkstn-0042', label: 'WKSTN-0042', type: 'endpoint', criticality: 'Tier 2', owner: 'Platform Ops' },
  { id: 'ep-k8s-04', label: 'k8s-node-worker-04', type: 'endpoint', criticality: 'Tier 2', owner: 'Platform Ops' },
  { id: 'ep-dev-007', label: 'WKSTN-DEV-007', type: 'endpoint', criticality: 'Tier 3', owner: 'Developer Services' },
  { id: 'svc-auth-01', label: 'auth-service', type: 'service', criticality: 'Tier 1', owner: 'Identity Team' },
  { id: 'svc-reporting-01', label: 'svc-customer-reporting', type: 'service', criticality: 'Tier 1', owner: 'BI Team' },
  { id: 'svc-etl-01', label: 'batch-etl-pipeline', type: 'service', criticality: 'Tier 2', owner: 'Data Eng' },
  { id: 'svc-order-01', label: 'order-processing-api', type: 'service', criticality: 'Tier 1', owner: 'Core Commerce' },
  { id: 'db-users-01', label: 'users-postgres', type: 'database', criticality: 'Tier 1', owner: 'DB Reliability' },
  { id: 'db-analytics-01', label: 'db-customer-analytics-cluster', type: 'database', criticality: 'Tier 1', owner: 'DB Reliability' },
  { id: 's3-pii-01', label: 'prod-user-pii-data', type: 'database', criticality: 'Tier 1', owner: 'Data Compliance' },
];

const enterpriseEdges = [
  { id: 'e-1', source: 'usr-0042', target: 'ep-wkstn-0042', label: 'AUTHENTICATED_TO' },
  { id: 'e-2', source: 'svc-acc-db-001', target: 'ep-k8s-04', label: 'AUTHENTICATED_TO' },
  { id: 'e-3', source: 'usr-contractor-1', target: 'ep-dev-007', label: 'AUTHENTICATED_TO' },
  { id: 'e-4', source: 'ep-wkstn-0042', target: 'svc-auth-01', label: 'HOSTS' },
  { id: 'e-5', source: 'ep-k8s-04', target: 'svc-reporting-01', label: 'HOSTS' },
  { id: 'e-6', source: 'ep-k8s-04', target: 'svc-etl-01', label: 'HOSTS' },
  { id: 'e-7', source: 'svc-reporting-01', target: 'svc-auth-01', label: 'DEPENDS_ON' },
  { id: 'e-8', source: 'svc-order-01', target: 'svc-auth-01', label: 'DEPENDS_ON' },
  { id: 'e-9', source: 'svc-etl-01', target: 'svc-reporting-01', label: 'DEPENDS_ON' },
  { id: 'e-10', source: 'svc-auth-01', target: 'db-users-01', label: 'READS_WRITES' },
  { id: 'e-11', source: 'svc-reporting-01', target: 'db-analytics-01', label: 'READS_WRITES' },
  { id: 'e-12', source: 'svc-acc-db-001', target: 's3-pii-01', label: 'READS_WRITES' },
];

assert(enterpriseNodes.length >= 13, `Seeded enterprise graph contains ${enterpriseNodes.length} nodes`);
assert(enterpriseEdges.length >= 12, `Seeded enterprise graph contains ${enterpriseEdges.length} edges`);

const nodeTypes = new Set(enterpriseNodes.map(n => n.type));
assert(nodeTypes.has('identity') && nodeTypes.has('endpoint') && nodeTypes.has('service') && nodeTypes.has('database'),
  'All 4 primary node types present in topology schema');

const edgeLabels = new Set(enterpriseEdges.map(e => e.label));
assert(edgeLabels.has('AUTHENTICATED_TO') && edgeLabels.has('HOSTS') && edgeLabels.has('DEPENDS_ON') && edgeLabels.has('READS_WRITES'),
  'All 4 critical dependency edge types present in topology schema');

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 2: BFS Blast Radius Traversal
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test Group 2: BFS Blast Radius Traversal & Disruption Quantification');

const nodeMap = new Map(enterpriseNodes.map(n => [n.id, n]));
const outwardAdj = new Map();
const inwardAdj = new Map();

for (const n of enterpriseNodes) {
  outwardAdj.set(n.id, []);
  inwardAdj.set(n.id, []);
}

for (const e of enterpriseEdges) {
  outwardAdj.get(e.source)?.push(e);
  inwardAdj.get(e.target)?.push(e);
}

const CRITICALITY_WEIGHTS = { 'Tier 1': 0.40, 'Tier 2': 0.15, 'Tier 3': 0.05 };

function calculateBlastRadius(targetId, actionType) {
  // Targeted actions
  if (['RevokeUserSession', 'RevokeToken', 'ResetPassword'].includes(actionType)) {
    return {
      targetId,
      actionType,
      disruptedServices: [],
      businessDisruptionCost: 0.10,
      blastRadiusScore: 0.05,
      impactedCount: 0,
    };
  }

  // Broad action (IsolateEndpoint)
  const visited = new Set([targetId]);
  const queue = [targetId];
  const disruptedServices = [];
  let totalCost = 0;

  while (queue.length > 0) {
    const currId = queue.shift();

    // Outward edges (e.g. Endpoint HOSTS Service)
    for (const edge of outwardAdj.get(currId) || []) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
        const node = nodeMap.get(edge.target);
        if (node) {
          totalCost += CRITICALITY_WEIGHTS[node.criticality] || 0.10;
          if (node.type === 'service') disruptedServices.push(node.label);
        }
      }
    }

    // Inward DEPENDS_ON edges (services depending on this service)
    const currNode = nodeMap.get(currId);
    if (currNode && currNode.type === 'service') {
      for (const edge of inwardAdj.get(currId) || []) {
        if (edge.label === 'DEPENDS_ON' && !visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push(edge.source);
          const depNode = nodeMap.get(edge.source);
          if (depNode) {
            totalCost += CRITICALITY_WEIGHTS[depNode.criticality] || 0.10;
            if (depNode.type === 'service') disruptedServices.push(depNode.label);
          }
        }
      }
    }
  }

  return {
    targetId,
    actionType,
    disruptedServices,
    businessDisruptionCost: Number(Math.min(0.95, totalCost).toFixed(2)),
    blastRadiusScore: Number(Math.min(0.95, disruptedServices.length * 0.20).toFixed(2)),
    impactedCount: visited.size - 1,
  };
}

// 1. Blast radius for targeted RevokeUserSession on usr-0042
const userBlast = calculateBlastRadius('usr-0042', 'RevokeUserSession');
assert(userBlast.disruptedServices.length === 0, 'Targeted RevokeUserSession produces 0 disrupted services');
assert(userBlast.businessDisruptionCost === 0.10, 'Targeted RevokeUserSession business disruption cost is minimal (0.10)');

// 2. Blast radius for broad IsolateEndpoint on ep-wkstn-0042
const endpointBlast = calculateBlastRadius('ep-wkstn-0042', 'IsolateEndpoint');
assert(endpointBlast.disruptedServices.length >= 3, `IsolateEndpoint on ep-wkstn-0042 disrupts ${endpointBlast.disruptedServices.length} services (due to auth-service dependency cascade)`);
assert(endpointBlast.disruptedServices.includes('auth-service'), 'Disrupted services set includes mission-critical auth-service');
assert(endpointBlast.disruptedServices.includes('order-processing-api'), 'Cascade disruption reaches upstream order-processing-api');
assert(endpointBlast.businessDisruptionCost >= 0.50, `Broad IsolateEndpoint incurs substantial disruption cost (${endpointBlast.businessDisruptionCost})`);

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 3: USP 1 Proof – Objective Action Ranking Formula
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test Group 3: USP 1 Proof – Multi-Factor Action Ranking Optimization');

const ALPHA = 0.50; // Weight for Security Containment Gain
const BETA = 0.35;  // Penalty weight for Business Disruption Cost
const GAMMA = 0.15; // Weight for Action Reversibility

function computeActionScore(securityGain, disruptionCost, reversibility) {
  return Number((ALPHA * securityGain - BETA * disruptionCost + GAMMA * reversibility).toFixed(4));
}

// Candidate Action 1: Targeted Session Revocation
const act1 = {
  id: 'act-001',
  name: 'Revoke All Active Sessions for michael.chen',
  securityGain: 0.85,
  disruptionCost: userBlast.businessDisruptionCost, // 0.10
  reversibility: 0.95,
};
const score1 = computeActionScore(act1.securityGain, act1.disruptionCost, act1.reversibility);

// Candidate Action 2: Broad Endpoint Isolation
const act2 = {
  id: 'act-002',
  name: 'Network-Isolate Endpoint WKSTN-0042',
  securityGain: 0.92,
  disruptionCost: endpointBlast.businessDisruptionCost, // >= 0.50
  reversibility: 0.70,
};
const score2 = computeActionScore(act2.securityGain, act2.disruptionCost, act2.reversibility);

console.log(`  📊 Action 1 (RevokeUserSession): Score = ${score1} (Gain=0.85, Cost=${act1.disruptionCost}, Rev=0.95)`);
console.log(`  📊 Action 2 (IsolateEndpoint):   Score = ${score2} (Gain=0.92, Cost=${act2.disruptionCost}, Rev=0.70)`);

assert(score1 > score2, 'USP 1 Validated: Targeted RevokeUserSession (Score: ' + score1 + ') outranks broad IsolateEndpoint (Score: ' + score2 + ')');
assert(act1.reversibility > act2.reversibility, 'Targeted action provides higher reversibility (0.95 vs 0.70)');
assert(act1.disruptionCost < act2.disruptionCost, 'Targeted action causes significantly lower business disruption (0.10 vs ' + act2.disruptionCost + ')');

// ─────────────────────────────────────────────────────────────────────────────
// Final Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(68));
console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('='.repeat(68) + '\n');

if (totalFailed > 0) process.exit(1);
