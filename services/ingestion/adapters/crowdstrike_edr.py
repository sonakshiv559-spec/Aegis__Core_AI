"""
AegisCore AI – CrowdStrike Falcon EDR Adapter

Handles CrowdStrike Falcon detection & process events.
Maps to OCSF EndpointActivity and ProcessActivity class events.

Supported event types:
  - DetectionSummaryEvent
  - ProcessRollupEvent (PRI v2)
  - NetworkConnectIP4 / NetworkConnectIP6
  - UserLogon / UserLogoff
"""

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict

from services.ingestion.adapters.base import BaseAdapter


class CrowdStrikeEDRAdapter(BaseAdapter):
    SOURCE_PRODUCT = "CrowdStrike Falcon"

    SEVERITY_TO_OUTCOME = {
        "Informational": "Unknown",
        "Low": "Success",
        "Medium": "Success",
        "High": "Failure",
        "Critical": "Failure",
    }

    EVENT_CLASS_MAP = {
        "DetectionSummaryEvent": "EndpointActivity",
        "ProcessRollupEvent": "ProcessActivity",
        "NetworkConnectIP4": "NetworkActivity",
        "NetworkConnectIP6": "NetworkActivity",
        "UserLogon": "Authentication",
        "UserLogoff": "Authentication",
        "DnsRequestEvent": "NetworkActivity",
        "FileWrittenEvent": "FileActivity",
        "FileDeletedEvent": "FileActivity",
    }

    ACTIVITY_MAP = {
        "DetectionSummaryEvent": "ThreatDetection",
        "ProcessRollupEvent": "ProcessSpawn",
        "NetworkConnectIP4": "NetworkConnect",
        "NetworkConnectIP6": "NetworkConnect",
        "UserLogon": "Logon",
        "UserLogoff": "Logoff",
        "DnsRequestEvent": "DNSQuery",
        "FileWrittenEvent": "FileWrite",
        "FileDeletedEvent": "FileDelete",
    }

    @classmethod
    def can_handle(cls, raw: Dict[str, Any]) -> bool:
        """CrowdStrike events include 'EventType' at top level."""
        return (
            "EventType" in raw
            and ("ComputerName" in raw or "DeviceId" in raw or "aid" in raw)
        )

    def to_ocsf_fields(self, raw: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        event_type = raw.get("EventType", "Unknown")

        # Timestamp: CrowdStrike uses epoch ms or ProcessStartTime
        ts_raw = raw.get("ProcessStartTime") or raw.get("Timestamp") or raw.get("EventCreationTime")
        try:
            if isinstance(ts_raw, (int, float)) and ts_raw > 1e10:
                time_observed = datetime.utcfromtimestamp(ts_raw / 1000)
            elif isinstance(ts_raw, (int, float)):
                time_observed = datetime.utcfromtimestamp(ts_raw)
            else:
                time_observed = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
        except (ValueError, TypeError, OSError):
            time_observed = datetime.utcnow()

        # Severity → Outcome
        severity = raw.get("Severity") or raw.get("SeverityName", "Informational")
        if isinstance(severity, int):
            severity = {1: "Informational", 2: "Low", 3: "Medium", 4: "High", 5: "Critical"}.get(severity, "Informational")
        outcome = self.SEVERITY_TO_OUTCOME.get(severity, "Unknown")

        # Actor: parent or user context
        actor = {
            "user_name": raw.get("UserName"),
            "user_uid": raw.get("UserId"),
            "process_name": raw.get("ParentImageFileName") or raw.get("ImageFileName"),
            "extras": {
                "parent_pid": raw.get("ParentProcessId"),
                "command_line": raw.get("CommandLine"),  # untrusted
                "sha256": raw.get("SHA256HashData"),
                "technique": raw.get("Technique"),
                "tactic": raw.get("Tactic"),
                "scenario": raw.get("Scenario"),
            },
        }

        # Target: spawned process or network destination
        target = {
            "resource_name": raw.get("ImageFileName") or raw.get("FileName"),
            "resource_type": "process" if "ProcessId" in raw else "file",
            "resource_uid": str(raw.get("ProcessId", "")),
            "ip_addr": raw.get("RemoteAddress"),
            "port": raw.get("RemotePort"),
            "extras": {
                "local_address": raw.get("LocalAddress"),
                "local_port": raw.get("LocalPort"),
            },
        }

        # Device
        device = {
            "hostname": raw.get("ComputerName") or raw.get("Hostname"),
            "ip_addr": raw.get("LocalAddress"),
            "agent_version": raw.get("FalconHostLink"),
            "extras": {
                "aid": raw.get("aid") or raw.get("DeviceId"),
                "cid": raw.get("cid"),
                "detection_id": raw.get("DetectId") or raw.get("InstanceId"),
            },
        }

        return {
            "tenant_id": tenant_id,
            "source_product": self.SOURCE_PRODUCT,
            "source_event_id": (
                raw.get("DetectId")
                or raw.get("InstanceId")
                or raw.get("RuleInstanceId", "")
            ),
            "event_class": self.EVENT_CLASS_MAP.get(event_type, "EndpointActivity"),
            "activity_name": self.ACTIVITY_MAP.get(event_type, "ThreatDetection"),
            "outcome": outcome,
            "time_observed": time_observed,
            "actor": actor,
            "target": target,
            "device": device,
        }
