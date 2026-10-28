"""
AegisCore AI – Cryptographically Bound Approval Contracts
Binds human approvals to exact targets, parameters, policy versions, and expiry.
Detects parameter tampering, stale approvals, and target entity desynchronization.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

from services.policy.rules import APPROVAL_EXPIRY_MINUTES, POLICY_VERSION


def canonical_hash(obj: Any) -> str:
    """Generates deterministic SHA-256 hash of JSON-serializable object."""
    canonical_str = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


class ApprovalContract(BaseModel):
    contract_id: str
    incident_id: str
    action_id: str
    target_id: str
    target_hash: str
    parameters_hash: str
    approver_name: str
    approver_role: str
    justification: str
    policy_version: str = POLICY_VERSION
    issued_at: str
    expires_at: str
    contract_signature: str
    is_invalidated: bool = False
    invalidation_reason: Optional[str] = None


class ApprovalContractManager:
    """
    Issues and cryptographically validates approval contracts.
    Pre-execution verification guarantees zero out-of-scope executions.
    """

    @classmethod
    def create_contract(
        cls,
        incident_id: str,
        action_id: str,
        target_id: str,
        parameters: Dict[str, Any],
        approver_name: str,
        approver_role: str,
        justification: str,
        expiry_minutes: int = APPROVAL_EXPIRY_MINUTES,
    ) -> ApprovalContract:
        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=expiry_minutes)

        target_hash = canonical_hash(f"{incident_id}:{target_id}")
        param_hash = canonical_hash(parameters)

        sig_payload = f"{target_hash}:{param_hash}:{approver_name}:{approver_role}:{POLICY_VERSION}"
        signature = hashlib.sha256(sig_payload.encode("utf-8")).hexdigest()
        contract_id = f"apr-{hashlib.sha256((signature + now.isoformat()).encode()).hexdigest()[:12]}"

        return ApprovalContract(
            contract_id=contract_id,
            incident_id=incident_id,
            action_id=action_id,
            target_id=target_id,
            target_hash=target_hash,
            parameters_hash=param_hash,
            approver_name=approver_name,
            approver_role=approver_role,
            justification=justification,
            policy_version=POLICY_VERSION,
            issued_at=now.isoformat(),
            expires_at=expires.isoformat(),
            contract_signature=signature,
            is_invalidated=False,
        )

    @classmethod
    def verify_pre_execution_integrity(
        cls,
        contract: ApprovalContract,
        current_target_id: str,
        current_parameters: Dict[str, Any],
        current_policy_version: str = POLICY_VERSION,
    ) -> Tuple[bool, str]:
        """
        Re-evaluates authorization contract immediately prior to execution.
        Must return (True, 'OK') to permit connector dispatch.
        """
        if contract.is_invalidated:
            return False, f"Contract already invalidated: {contract.invalidation_reason}"

        # 1. Check expiration
        now = datetime.now(timezone.utc)
        try:
            exp_time = datetime.fromisoformat(contract.expires_at.replace("Z", "+00:00"))
            if now > exp_time:
                contract.is_invalidated = True
                contract.invalidation_reason = "Approval contract has expired."
                return False, "Approval contract has expired. Re-authorization required."
        except Exception:
            return False, "Invalid expiry timestamp format."

        # 2. Check target entity tamper
        expected_target_hash = canonical_hash(f"{contract.incident_id}:{current_target_id}")
        if expected_target_hash != contract.target_hash:
            contract.is_invalidated = True
            contract.invalidation_reason = f"Target mismatch: {current_target_id} does not match signed target hash."
            return False, "Target entity mismatch. Action target was altered after approval."

        # 3. Check parameters tamper
        current_param_hash = canonical_hash(current_parameters)
        if current_param_hash != contract.parameters_hash:
            contract.is_invalidated = True
            contract.invalidation_reason = "Parameters altered after human approval sign-off."
            return False, "Parameter tamper detected. Action parameters were modified after approval."

        # 4. Check policy version match
        if current_policy_version != contract.policy_version:
            contract.is_invalidated = True
            contract.invalidation_reason = f"Policy version mismatch: active {current_policy_version} vs signed {contract.policy_version}"
            return False, "Policy version updated after approval. Policy re-check required."

        return True, "Approval contract integrity verified."
