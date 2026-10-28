"""Ingestion adapters package."""
from services.ingestion.adapters.base import BaseAdapter
from services.ingestion.adapters.okta_idp import OktaIdPAdapter
from services.ingestion.adapters.crowdstrike_edr import CrowdStrikeEDRAdapter
from services.ingestion.adapters.aws_cloudtrail import AWSCloudTrailAdapter
from services.ingestion.adapters.network_syslog import NetworkSyslogAdapter

# Ordered list: more specific adapters first
ADAPTER_REGISTRY: list[type[BaseAdapter]] = [
    OktaIdPAdapter,
    CrowdStrikeEDRAdapter,
    AWSCloudTrailAdapter,
    NetworkSyslogAdapter,
]

__all__ = [
    "BaseAdapter",
    "OktaIdPAdapter",
    "CrowdStrikeEDRAdapter",
    "AWSCloudTrailAdapter",
    "NetworkSyslogAdapter",
    "ADAPTER_REGISTRY",
]
