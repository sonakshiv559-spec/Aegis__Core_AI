/**
 * AegisCore AI – Phase 6 Deterministic Policy & Human Approval Mode Validation (USP 2)
 * 
 * Tests:
 * 1. Evidence Predicate Gating: High model confidence (0.99) cannot bypass missing predicates
 * 2. Multi-Tier Autonomy Gating: Operating mode evaluation (Approval Mode vs Automatic Opt-in)
 * 3. Emergency Kill Switch: Freezes all actions when active
 * 4. Cryptographic Approval Contracts: Integrity hashing, parameter tamper detection, expiry checks
 * 5. RBAC Authorization: Role-based tier sign-off enforcement
 */

import crypto from 'crypto';

console.log('\n' + '='.repeat(68));
console.log('  AegisCore Phase 6 – Deterministic Policy & Approval Validation (USP 2)');
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

function canonicalHash(obj) {
  const canonicalStr = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(canonicalStr, 'utf8').digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 1: Evidence Predicate Gating (USP 2 Core)
// ─────────────────────────────────────────────────────────────────────────────
console.log('📋 Test Group 1: Evidence Predicate Gating (High Confidence Cannot Bypass)');

const ACTION_PREDICATES = {
  RevokeUserSession: ['active_session_confirmed', 'external_ip_flagged'],
  IsolateEndpoint: ['credential_dump_confirmed', 'endpoint_telemetry_present'],
};

function evaluateEvidenceGating(actionType, verifiedPredicates, modelConfidence) {
  const required = ACTION_PREDICATES[actionType] || [];
  const missing = required.filter(p => !verifiedPredicates.includes(p));

  // Even if modelConfidence is 0.99 (or 1.0), missing predicates MUST DENY automatic/unearned rights
  if (missing.length > 0) {
    return {
      permitted: false,
      reason: `DENIED_INSUFFICIENT_EVIDENCE: missing [${missing.join(', ')}]`,
      missing,
    };
  }

  return { permitted: true, reason: 'PREDICATES_SATISFIED', missing: [] };
}

// Case 1: High confidence (0.99) but missing external_ip_flagged
const gateFail = evaluateEvidenceGating('RevokeUserSession', ['active_session_confirmed'], 0.99);
assert(!gateFail.permitted, 'USP 2 Invariant: Model confidence 0.99 CANNOT bypass missing evidence predicates');
assert(gateFail.missing.includes('external_ip_flagged'), 'Missing predicate correctly identified as external_ip_flagged');

// Case 2: All predicates satisfied
const gatePass = evaluateEvidenceGating('RevokeUserSession', ['active_session_confirmed', 'external_ip_flagged'], 0.85);
assert(gatePass.permitted, 'Action passes evidence gate when all mandatory predicates are verified');

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 2: Multi-Tier Autonomy Gating & Operating Modes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test Group 2: Action Tiering & Operating Mode Authorization');

function evaluateModePolicy(tier, operatingMode, emergencyHalt, disruptionCost) {
  if (emergencyHalt) {
    return { decision: 'HALTED_EMERGENCY_KILL_SWITCH', permitted: false };
  }

  if (tier === 0) {
    return { decision: 'PERMITTED_AUTOMATIC', permitted: true };
  }

  if (operatingMode === 'approval') {
    // Default mode: Tier 1, 2, 3 all require authenticated human sign-off
    return { decision: 'REQUIRES_HUMAN_APPROVAL', permitted: false };
  }

  if (operatingMode === 'automatic') {
    // Opt-in mode: Tier 1 allowed ONLY if low disruption cost (<= 0.20)
    if (tier === 1 && disruptionCost <= 0.20) {
      return { decision: 'PERMITTED_AUTOMATIC', permitted: true };
    }
    // Tier 2 and 3 ALWAYS mandate approval, even in automatic mode
    return { decision: 'REQUIRES_HUMAN_APPROVAL', permitted: false };
  }

  return { decision: 'UNKNOWN', permitted: false };
}

// Approval Mode tests
assert(evaluateModePolicy(0, 'approval', false, 0.0).decision === 'PERMITTED_AUTOMATIC', 'Tier 0 is permitted automatically in Approval Mode');
assert(evaluateModePolicy(1, 'approval', false, 0.10).decision === 'REQUIRES_HUMAN_APPROVAL', 'Tier 1 mandates human approval in default Approval Mode');
assert(evaluateModePolicy(2, 'approval', false, 0.55).decision === 'REQUIRES_HUMAN_APPROVAL', 'Tier 2 mandates human approval in default Approval Mode');
assert(evaluateModePolicy(3, 'approval', false, 0.90).decision === 'REQUIRES_HUMAN_APPROVAL', 'Tier 3 mandates human approval in default Approval Mode');

// Automatic Mode (opt-in) tests
assert(evaluateModePolicy(1, 'automatic', false, 0.10).decision === 'PERMITTED_AUTOMATIC', 'Tier 1 is permitted automatically in Opt-In Automatic Mode (low disruption)');
assert(evaluateModePolicy(1, 'automatic', false, 0.35).decision === 'REQUIRES_HUMAN_APPROVAL', 'Tier 1 with high disruption (>0.20) falls back to human approval');
assert(evaluateModePolicy(2, 'automatic', false, 0.55).decision === 'REQUIRES_HUMAN_APPROVAL', 'Tier 2 material change MANDATES human approval even in Automatic Mode');
assert(evaluateModePolicy(3, 'automatic', false, 0.90).decision === 'REQUIRES_HUMAN_APPROVAL', 'Tier 3 critical infrastructure change MANDATES human approval in Automatic Mode');

// Emergency Kill Switch
assert(evaluateModePolicy(0, 'approval', true, 0.0).decision === 'HALTED_EMERGENCY_KILL_SWITCH', 'Emergency Kill Switch instantly halts all execution');

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 3: Cryptographically Bound Approval Contracts
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test Group 3: Cryptographically Bound Approval Contracts & Anti-Tamper');

function createApprovalContract(incidentId, actionId, targetId, parameters, approver, role, expiryMinutes = 15) {
  const targetHash = crypto.createHash('sha256').update(`${incidentId}:${targetId}`).digest('hex');
  const paramHash = canonicalHash(parameters);
  const now = Date.now();
  const expiresAt = now + expiryMinutes * 60 * 1000;
  const policyVersion = 'v1.0.0';

  const sigPayload = `${targetHash}:${paramHash}:${approver}:${role}:${policyVersion}`;
  const signature = crypto.createHash('sha256').update(sigPayload).digest('hex');

  return {
    incidentId,
    actionId,
    targetId,
    targetHash,
    parametersHash: paramHash,
    approver,
    role,
    policyVersion,
    expiresAt,
    signature,
    isInvalidated: false,
  };
}

function verifyContractBeforeExecution(contract, liveTargetId, liveParameters, livePolicyVersion = 'v1.0.0') {
  if (contract.isInvalidated) return { valid: false, reason: 'ALREADY_INVALIDATED' };

  // Check expiration
  if (Date.now() > contract.expiresAt) {
    contract.isInvalidated = true;
    return { valid: false, reason: 'CONTRACT_EXPIRED' };
  }

  // Check target integrity
  const expectedTargetHash = crypto.createHash('sha256').update(`${contract.incidentId}:${liveTargetId}`).digest('hex');
  if (expectedTargetHash !== contract.targetHash) {
    contract.isInvalidated = true;
    return { valid: false, reason: 'TARGET_MUTATED' };
  }

  // Check parameter integrity
  const currentParamHash = canonicalHash(liveParameters);
  if (currentParamHash !== contract.parametersHash) {
    contract.isInvalidated = true;
    return { valid: false, reason: 'PARAMETERS_TAMPERED' };
  }

  // Check policy version
  if (livePolicyVersion !== contract.policyVersion) {
    contract.isInvalidated = true;
    return { valid: false, reason: 'POLICY_VERSION_CHANGED' };
  }

  return { valid: true, reason: 'INTEGRITY_VERIFIED' };
}

const originalParams = { user_id: 'usr-0042', scope: 'all_sessions' };
const contract = createApprovalContract(
  'INC-2026-8841',
  'act-001',
  'usr-0042',
  originalParams,
  'Sarah Vance',
  'Lead SOC Tier-3 Responder'
);

// 1. Valid execution verification
const contract1 = createApprovalContract('INC-2026-8841', 'act-001', 'usr-0042', originalParams, 'Sarah Vance', 'Lead SOC Tier-3 Responder');
const check1 = verifyContractBeforeExecution(contract1, 'usr-0042', originalParams);
assert(check1.valid, 'Pre-execution verification succeeds with unmodified parameters and valid expiry');

// 2. Tampered parameter detection (e.g., adversary or bug alters scope or user)
const contract2 = createApprovalContract('INC-2026-8841', 'act-001', 'usr-0042', originalParams, 'Sarah Vance', 'Lead SOC Tier-3 Responder');
const tamperedParams = { user_id: 'usr-0042', scope: 'global_admin_escalate' };
const check2 = verifyContractBeforeExecution(contract2, 'usr-0042', tamperedParams);
assert(!check2.valid && check2.reason === 'PARAMETERS_TAMPERED', 'Anti-Tamper Invariant: Parameter modification detected and blocked');

// 3. Target mutation detection
const contract3 = createApprovalContract('INC-2026-8841', 'act-001', 'usr-0042', originalParams, 'Sarah Vance', 'Lead SOC Tier-3 Responder');
const check3 = verifyContractBeforeExecution(contract3, 'usr-9999-different-target', originalParams);
assert(!check3.valid && check3.reason === 'TARGET_MUTATED', 'Anti-Tamper Invariant: Target entity mismatch detected and blocked');

// 4. Expiration check
const expiredContract = createApprovalContract(
  'INC-2026-8841',
  'act-001',
  'usr-0042',
  originalParams,
  'Sarah Vance',
  'Lead SOC Tier-3 Responder',
  -5 // Expired 5 minutes ago
);
const check4 = verifyContractBeforeExecution(expiredContract, 'usr-0042', originalParams);
assert(!check4.valid && check4.reason === 'CONTRACT_EXPIRED', 'Stale Approval Invariant: Expired contract rejected');

// ─────────────────────────────────────────────────────────────────────────────
// Test Group 4: RBAC Role Authorization
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test Group 4: Role-Based Access Control (RBAC) Hierarchy');

const ROLE_TIERS = {
  'SOC Tier-1 Triage': [0],
  'SOC Tier-2 Analyst': [0, 1],
  'Lead SOC Tier-3 Responder': [0, 1, 2],
  'SecOps Lead': [0, 1, 2],
  'SecOps Director / CISO': [0, 1, 2, 3],
};

function isRoleAuthorized(role, actionTier) {
  const allowedTiers = ROLE_TIERS[role] || [];
  return allowedTiers.includes(actionTier);
}

assert(isRoleAuthorized('SOC Tier-2 Analyst', 1), 'Tier-2 Analyst authorized for Tier 1 actions');
assert(!isRoleAuthorized('SOC Tier-1 Triage', 2), 'Tier-1 Triage BLOCKED from authorizing Tier 2 actions');
assert(isRoleAuthorized('Lead SOC Tier-3 Responder', 2), 'Lead SOC Tier-3 Responder authorized for Tier 2 actions');
assert(!isRoleAuthorized('Lead SOC Tier-3 Responder', 3), 'Lead SOC Tier-3 Responder BLOCKED from authorizing Tier 3 broad infrastructure actions');
assert(isRoleAuthorized('SecOps Director / CISO', 3), 'SecOps Director / CISO authorized for Tier 3 actions');

// ─────────────────────────────────────────────────────────────────────────────
// Final Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(68));
console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('='.repeat(68) + '\n');

if (totalFailed > 0) process.exit(1);
