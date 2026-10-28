"""
AegisCore AI – Network / Syslog Adapter

Handles structured network firewall and syslog events.
Compatible with:
  - Palo Alto NGFW (PAN-OS) log format
  - Generic RFC-5424 structured syslog with key=value pairs
  - JSON-formatted network flow records (e.g., AWS VPC Flow Logs)

Maps to OCSF NetworkActivity class events.
"""

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict
import re

from services.ingestion.adapters.base import BaseAdapter


class NetworkSyslogAdapter(BaseAdapter):
    SOURCE_PRODUCT = "Network Syslog"

    # PAN-OS subtype → OCSF activity
    PANFW_ACTIVITY_MAP = {
        "traffic": "NetworkConnect",
        "threat": "ThreatDetection",
        "auth": "Logon",
        "config": "PolicyChange",
        "system": "SystemActivity",
        "wildfire": "ThreatDetection",
        "url": "WebRequest",
    }

    ACTION_OUTCOME_MAP = {
        "allow": "Success",
        "deny": "Failure",
        "drop": "Failure",
        "reset-client": "Failure",
        "reset-server": "Failure",
        "reset-both": "Failure",
        "block": "Failure",
        "reject": "Failure",
        "permit": "Success",
    }

    # VPC Flow Log field order (space-delimited)
    VPC_FIELDS = [
        "version", "account_id", "interface_id", "srcaddr", "dstaddr",
        "srcport", "dstport", "protocol", "packets", "bytes",
        "start", "end", "action", "log_status",
    ]

    @classmethod
    def can_handle(cls, raw: Dict[str, Any]) -> bool:
        """
        Detects:
        1. PAN-OS: has 'subtype' + 'action' + 'src_ip' or 'srcaddr'
        2. VPC Flow: has 'srcaddr' + 'dstaddr' + 'action' (no vendor fields)
        3. Generic syslog JSON: has 'src_ip' + 'dst_ip' + 'proto'
        """
        has_network_fields = (
            ("src_ip" in raw and "dst_ip" in raw)
            or ("srcaddr" in raw and "dstaddr" in raw)
            or ("source_ip" in raw and "destination_ip" in raw)
        )
        return has_network_fields or ("subtype" in raw and "action" in raw)

    def to_ocsf_fields(self, raw: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        # Detect vendor type
        is_panfw = "subtype" in raw and "receive_time" in raw
        is_vpc = "interface_id" in raw and "account_id" in raw

        # Normalise field names across vendor formats
        src_ip = (
            raw.get("src_ip") or raw.get("srcaddr")
            or raw.get("source_ip") or ""
        )
        dst_ip = (
            raw.get("dst_ip") or raw.get("dstaddr")
            or raw.get("destination_ip") or ""
        )
        src_port = raw.get("src_port") or raw.get("srcport") or raw.get("source_port")
        dst_port = raw.get("dst_port") or raw.get("dstport") or raw.get("destination_port")
        protocol = raw.get("proto") or raw.get("protocol") or raw.get("ip_protocol", "")
        action = str(raw.get("action", "allow")).lower()

        # Timestamp
        ts_raw = (
            raw.get("receive_time") or raw.get("time_generated")
            or raw.get("start") or raw.get("timestamp")
        )
        try:
            if isinstance(ts_raw, (int, float)) and ts_raw > 1e9:
                time_observed = datetime.utcfromtimestamp(ts_raw)
            elif ts_raw:
                time_observed = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
            else:
                time_observed = datetime.utcnow()
        except (ValueError, TypeError, OSError):
            time_observed = datetime.utcnow()

        # Source product override
        source_product = (
            "Palo Alto NGFW" if is_panfw
            else "AWS VPC Flow Logs" if is_vpc
            else self.SOURCE_PRODUCT
        )

        # Activity name
        subtype = raw.get("subtype", "traffic")
        activity_name = self.PANFW_ACTIVITY_MAP.get(subtype, "NetworkConnect")

        # Outcome from action
        outcome = self.ACTION_OUTCOME_MAP.get(action, "Unknown")

        network = {
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": int(src_port) if src_port else None,
            "dst_port": int(dst_port) if dst_port else None,
            "protocol": str(protocol),
            "direction": raw.get("direction", "inbound"),
            "extras": {
                "bytes": raw.get("bytes") or raw.get("bytes_sent"),
                "packets": raw.get("packets"),
                "application": raw.get("app"),
                "rule_name": raw.get("rule"),
                "threat_id": raw.get("threatid"),
                "category": raw.get("category"),
                "action": action,
            },
        }

        # Actor: source IP (no PII in syslog flows)
        actor = {
            "ip_addr": src_ip,
            "extras": {"zone": raw.get("from_zone") or raw.get("from")},
        }

        target = {
            "ip_addr": dst_ip,
            "port": int(dst_port) if dst_port else None,
            "resource_type": "network_endpoint",
            "extras": {"zone": raw.get("to_zone") or raw.get("to")},
        }

        return {
            "tenant_id": tenant_id,
            "source_product": source_product,
            "source_event_id": (
                raw.get("logid") or raw.get("flow_id")
                or raw.get("seqno") or raw.get("id", "")
            ),
            "event_class": "NetworkActivity",
            "activity_name": activity_name,
            "outcome": outcome,
            "time_observed": time_observed,
            "actor": actor,
            "target": target,
            "network": network,
        }
