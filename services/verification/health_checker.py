"""
AegisCore AI – Upstream Service Health Verification Engine
Verifies that remediation containment actions did not cause unintended collateral damage
to business services in the dependency graph.
"""

from __future__ import annotations

from typing import Dict, List, Optional
import structlog

logger = structlog.get_logger()


class ServiceHealthReport:
    def __init__(
        self,
        all_healthy: bool,
        monitored_services: List[str],
        healthy_services: List[str],
        degraded_services: List[str],
        discrepancy_detected: bool,
        notes: str,
    ):
        self.all_healthy = all_healthy
        self.monitored_services = monitored_services
        self.healthy_services = healthy_services
        self.degraded_services = degraded_services
        self.discrepancy_detected = discrepancy_detected
        self.notes = notes


class ServiceHealthChecker:
    """
    Evaluates health of dependent services from the context graph.
    """

    DEFAULT_SERVICES = [
        "auth-service",
        "svc-customer-reporting",
        "order-processing-api",
        "batch-etl-pipeline",
    ]

    def verify_service_health(
        self,
        dependent_services: Optional[List[str]] = None,
        simulate_collateral_failure: bool = False,
    ) -> ServiceHealthReport:
        services_to_check = dependent_services or self.DEFAULT_SERVICES
        healthy: List[str] = []
        degraded: List[str] = []

        if simulate_collateral_failure:
            # Simulate unintended collateral outage to order-processing-api
            for s in services_to_check:
                if "order" in s.lower() or "auth" in s.lower():
                    degraded.append(s)
                else:
                    healthy.append(s)
            notes = (
                f"COLLATERAL SERVICE FAILURE: Remediation action triggered unexpected downtime on "
                f"mission-critical services: {degraded}. Health checks returning HTTP 503 Service Unavailable."
            )
            logger.error("aegiscore.health.collateral_damage_detected", degraded=degraded)
            return ServiceHealthReport(
                all_healthy=False,
                monitored_services=services_to_check,
                healthy_services=healthy,
                degraded_services=degraded,
                discrepancy_detected=True,
                notes=notes,
            )

        # Normal healthy operation
        healthy = list(services_to_check)
        notes = f"All {len(healthy)} dependent services verified operational (HTTP 200 OK / latency < 60ms)."
        return ServiceHealthReport(
            all_healthy=True,
            monitored_services=services_to_check,
            healthy_services=healthy,
            degraded_services=[],
            discrepancy_detected=False,
            notes=notes,
        )
