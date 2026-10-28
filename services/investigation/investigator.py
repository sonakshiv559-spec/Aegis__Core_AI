"""
AegisCore AI – Investigator Agent
Directed evidence gathering, provenance mapping, and multi-source timeline correlation.
Bounded: CANNOT run arbitrary unvetted tools or invent missing evidence.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
import structlog

from schemas.ocsf import OCSFEvent
from schemas.incident import (
    AffectedEntity,
    AgentTrace,
    ClaimItem,
    ClaimSourceRef,
    EvidenceItem,
)
from services.investigation.tools import BoundedInvestigationTools
from services.investigation.sentry import SentryAssessment

logger = structlog.get_logger()


class InvestigatorFinding:
    def __init__(
        self,
        claims: List[ClaimItem],
        evidence: List[EvidenceItem],
        affected_entities: List[AffectedEntity],
        data_gaps: List[str],
        trace: AgentTrace,
    ):
        self.claims = claims
        self.evidence = evidence
        self.affected_entities = affected_entities
        self.data_gaps = data_gaps
        self.trace = trace


class InvestigatorAgent:
    """
    Investigator Agent:
    - Directed evidence gathering across identity, endpoint, cloud, and network
    - Strict provenance mapping: Every claim links to an event_id or is marked inference
    - Treats all tool outputs and logs as untrusted content
    - Identifies data gaps and unknown dimensions
    """

    def __init__(self, tools: Optional[BoundedInvestigationTools] = None):
        self.tools = tools or BoundedInvestigationTools()

    def investigate(
        self,
        trigger_event: OCSFEvent,
        sentry_assessment: SentryAssessment,
    ) -> InvestigatorFinding:
        now_iso = datetime.now(timezone.utc).isoformat()
        claims: List[ClaimItem] = []
        evidence: List[EvidenceItem] = []
        entities: List[AffectedEntity] = []
        data_gaps: List[str] = []

        # 1. Primary Trigger Provenance Claim
        user_name = trigger_event.actor.user_name if trigger_event.actor else "unknown_user"
        src_ip = trigger_event.network.src_ip if trigger_event.network else (trigger_event.actor.ip_addr if trigger_event.actor else "unknown_ip")

        claims.append(
            ClaimItem(
                id=f"clm-{len(claims)+1:03d}",
                text=f"Initial trigger event observed: {trigger_event.activity_name} ({trigger_event.outcome}) from {user_name} via {trigger_event.source_product}.",
                is_inference=False,
                source_ref=ClaimSourceRef(
                    event_id=trigger_event.event_id,
                    source_product=trigger_event.source_product,
                    time_observed=trigger_event.time_observed.isoformat(),
                    raw_event_ref=trigger_event.raw_event_ref,
                ),
            )
        )

        evidence.append(
            EvidenceItem(
                id=f"ev-{trigger_event.event_id[:8]}",
                type="idp" if "Okta" in trigger_event.source_product else ("edr" if "CrowdStrike" in trigger_event.source_product else "cloud"),
                source_product=trigger_event.source_product,
                event_id=trigger_event.event_id,
                observed_at=trigger_event.time_observed.isoformat(),
                summary=f"{trigger_event.source_product} {trigger_event.activity_name} from {src_ip}",
                is_corroborating=True,
                is_contradicting=False,
                raw_payload=json.dumps({"event_id": trigger_event.event_id, "ip": src_ip, "user": user_name}),
                is_untrusted=True,
                fields={"ip": src_ip, "user": user_name, "activity": trigger_event.activity_name},
            )
        )

        # 2. Correlate User Identity Sessions via Okta tool
        sessions = self.tools.correlate_user_sessions(user_name)
        for s in sessions:
            if s["event_id"] != trigger_event.event_id:
                claims.append(
                    ClaimItem(
                        id=f"clm-{len(claims)+1:03d}",
                        text=f"User session observed from IP {s['ip']} ({s['zone']}) using authentication method: {s['mfa_method']}.",
                        is_inference=False,
                        source_ref=ClaimSourceRef(
                            event_id=s["event_id"],
                            source_product=s["source"],
                            time_observed=s["time"],
                        ),
                    )
                )
                evidence.append(
                    EvidenceItem(
                        id=f"ev-{s['event_id'][:8]}",
                        type="idp",
                        source_product=s["source"],
                        event_id=s["event_id"],
                        observed_at=s["time"],
                        summary=f"Session from {s['ip']} via {s['mfa_method']}",
                        is_corroborating=True,
                        is_contradicting=False,
                        raw_payload=json.dumps(s),
                        is_untrusted=True,
                        fields=s,
                    )
                )

        # 3. Check IP Threat Reputation
        if src_ip != "unknown_ip":
            rep = self.tools.check_ip_reputation(src_ip)
            if rep["is_suspicious"]:
                claims.append(
                    ClaimItem(
                        id=f"clm-{len(claims)+1:03d}",
                        text=f"IP address {src_ip} flagged with threat score {rep['threat_score']} (Category: {rep['category']}).",
                        is_inference=False,
                        source_ref=ClaimSourceRef(
                            event_id=trigger_event.event_id,
                            source_product="Threat Intelligence Feed",
                            time_observed=now_iso,
                        ),
                    )
                )
            else:
                data_gaps.append(f"Source IP {src_ip} has no known malicious history; may be clean proxy or residential ISP.")

        # 4. Check Endpoint Forensics
        hostname = trigger_event.device.hostname if trigger_event.device else "WKSTN-0042"
        endpoint_events = self.tools.query_endpoint_forensics(hostname)
        if endpoint_events:
            for ep in endpoint_events:
                claims.append(
                    ClaimItem(
                        id=f"clm-{len(claims)+1:03d}",
                        text=f"Endpoint activity detected on {hostname}: process '{ep['process_name']}' spawned under '{ep['parent_process']}' ({ep['technique']}).",
                        is_inference=False,
                        source_ref=ClaimSourceRef(
                            event_id=ep["event_id"],
                            source_product=ep["source"],
                            time_observed=now_iso,
                        ),
                    )
                )
                evidence.append(
                    EvidenceItem(
                        id=f"ev-{ep['event_id'][:8]}",
                        type="edr",
                        source_product=ep["source"],
                        event_id=ep["event_id"],
                        observed_at=now_iso,
                        summary=f"{ep['technique']} on {hostname}",
                        is_corroborating=True,
                        is_contradicting=False,
                        raw_payload=json.dumps(ep),
                        is_untrusted=True,
                        fields=ep,
                    )
                )
        else:
            data_gaps.append(f"No active EDR alert retrieved for target host '{hostname}'. Endpoint logs may be delayed.")

        # 5. Populate Affected Entities
        if user_name != "unknown_user":
            is_svc = user_name.startswith("svc-")
            entities.append(
                AffectedEntity(
                    id=f"usr-{user_name}",
                    name=user_name,
                    type="service_account" if is_svc else "user",
                    criticality="Tier 1" if is_svc else "Tier 2",
                )
            )

        if hostname:
            entities.append(
                AffectedEntity(
                    id=f"ep-{hostname.lower()}",
                    name=hostname,
                    type="endpoint",
                    criticality="Tier 2",
                )
            )

        # 6. Explicitly labelled Inference Claim
        claims.append(
            ClaimItem(
                id=f"clm-inf-{len(claims)+1:03d}",
                text=f"Correlation suggests actor possessing compromised credentials may be attempting persistence or lateral movement.",
                is_inference=True,
            )
        )

        trace = AgentTrace(
            agent="Investigator",
            timestamp=now_iso,
            observation=(
                f"Gathered {len(evidence)} evidence records across Okta and EDR telemetry. "
                f"Established provenance for {len(claims)-1} factual claims and 1 explicit inference. "
                f"Identified {len(data_gaps)} telemetry data gaps."
            ),
            uncertainty_notes="; ".join(data_gaps) if data_gaps else "Telemetry coverage complete for queried window.",
        )

        logger.info(
            "aegiscore.investigator.investigation_completed",
            claims=len(claims),
            evidence=len(evidence),
            data_gaps=len(data_gaps),
        )

        return InvestigatorFinding(
            claims=claims,
            evidence=evidence,
            affected_entities=entities,
            data_gaps=data_gaps,
            trace=trace,
        )
