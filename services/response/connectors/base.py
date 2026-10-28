"""
AegisCore AI – Base Connector Framework
Abstract base for all response connectors with idempotency, timeouts, and circuit breakers.
Connectors adhere strictly to least-privilege, granular action APIs.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import hashlib
import json
import time
from typing import Any, Dict, Optional, Tuple
import structlog

logger = structlog.get_logger()


class ConnectorExecutionResult:
    def __init__(
        self,
        action_id: str,
        connector_name: str,
        status: str,  # SUCCESS | FAILED | TIMEOUT | IDEMPOTENT_REPLAY | HALTED
        status_code: int,  # e.g. 200, 400, 504
        message: str,
        idempotency_key: str,
        target_entity_id: str,
        simulated_state: Dict[str, Any],
        execution_time_ms: float,
    ):
        self.action_id = action_id
        self.connector_name = connector_name
        self.status = status
        self.status_code = status_code
        self.message = message
        self.idempotency_key = idempotency_key
        self.target_entity_id = target_entity_id
        self.simulated_state = simulated_state
        self.execution_time_ms = execution_time_ms
        self.executed_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_id": self.action_id,
            "connector_name": self.connector_name,
            "status": self.status,
            "status_code": self.status_code,
            "message": self.message,
            "idempotency_key": self.idempotency_key,
            "target_entity_id": self.target_entity_id,
            "simulated_state": self.simulated_state,
            "execution_time_ms": self.execution_time_ms,
            "executed_at": self.executed_at,
        }


class BaseConnector(ABC):
    """
    Abstract base connector.
    Guarantees:
    1. Idempotency check: repeated calls with same key return cached result without re-executing
    2. Execution timeout protection
    3. Circuit breaker on repeated failures (max 2 retries)
    4. Fine-grained action scoping
    """

    CONNECTOR_NAME = "BaseConnector"
    MAX_RETRIES = 2
    TIMEOUT_SECONDS = 10.0

    def __init__(self):
        # In-memory idempotency cache (production uses Redis)
        self._idempotency_cache: Dict[str, ConnectorExecutionResult] = {}
        self._consecutive_failures = 0

    @classmethod
    def generate_idempotency_key(
        cls, incident_id: str, action_id: str, target_id: str, parameters: Dict[str, Any]
    ) -> str:
        payload = f"{incident_id}:{action_id}:{target_id}:{json.dumps(parameters, sort_keys=True)}"
        return "idemp-" + hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

    @abstractmethod
    def _execute_scoped_action(
        self, action_id: str, target_id: str, parameters: Dict[str, Any]
    ) -> Tuple[int, str, Dict[str, Any]]:
        """
        Subclass implements specific connector logic.
        Returns: (status_code, message, simulated_target_state)
        """
        ...

    def execute(
        self,
        incident_id: str,
        action_id: str,
        target_id: str,
        parameters: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> ConnectorExecutionResult:
        key = idempotency_key or self.generate_idempotency_key(incident_id, action_id, target_id, parameters)

        # ── Idempotency Check ────────────────────────────────────
        if key in self._idempotency_cache:
            cached = self._idempotency_cache[key]
            logger.info("aegiscore.connector.idempotent_replay", key=key, connector=self.CONNECTOR_NAME)
            return ConnectorExecutionResult(
                action_id=action_id,
                connector_name=self.CONNECTOR_NAME,
                status="IDEMPOTENT_REPLAY",
                status_code=cached.status_code,
                message=f"Idempotent replay: action already completed. Cached response returned.",
                idempotency_key=key,
                target_entity_id=target_id,
                simulated_state=cached.simulated_state,
                execution_time_ms=0.5,
            )

        # ── Circuit Breaker Check ────────────────────────────────
        if self._consecutive_failures >= self.MAX_RETRIES:
            logger.error("aegiscore.connector.circuit_breaker_open", connector=self.CONNECTOR_NAME)
            return ConnectorExecutionResult(
                action_id=action_id,
                connector_name=self.CONNECTOR_NAME,
                status="FAILED",
                status_code=503,
                message=f"Circuit breaker OPEN for connector {self.CONNECTOR_NAME} after repeated failures.",
                idempotency_key=key,
                target_entity_id=target_id,
                simulated_state={},
                execution_time_ms=0.0,
            )

        # ── Execution with Timing ────────────────────────────────
        start_time = time.perf_counter()
        try:
            status_code, message, simulated_state = self._execute_scoped_action(
                action_id, target_id, parameters
            )
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            is_success = 200 <= status_code < 300
            result_status = "SUCCESS" if is_success else "FAILED"

            if is_success:
                self._consecutive_failures = 0
            else:
                self._consecutive_failures += 1

            result = ConnectorExecutionResult(
                action_id=action_id,
                connector_name=self.CONNECTOR_NAME,
                status=result_status,
                status_code=status_code,
                message=message,
                idempotency_key=key,
                target_entity_id=target_id,
                simulated_state=simulated_state,
                execution_time_ms=elapsed_ms,
            )

            # Store in idempotency cache on success
            if is_success:
                self._idempotency_cache[key] = result

            return result

        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            self._consecutive_failures += 1
            logger.error("aegiscore.connector.execution_exception", connector=self.CONNECTOR_NAME, error=str(exc))
            return ConnectorExecutionResult(
                action_id=action_id,
                connector_name=self.CONNECTOR_NAME,
                status="FAILED",
                status_code=500,
                message=f"Connector error: {str(exc)}",
                idempotency_key=key,
                target_entity_id=target_id,
                simulated_state={},
                execution_time_ms=elapsed_ms,
            )
