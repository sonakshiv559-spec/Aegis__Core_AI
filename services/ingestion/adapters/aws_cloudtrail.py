"""
AegisCore AI – AWS CloudTrail Adapter

Handles AWS CloudTrail management event records.
Maps to OCSF CloudActivity and PolicyChange class events.

Supported record types:
  - Management events: ConsoleLogin, AssumeRole, CreateUser, DeleteUser,
    AttachRolePolicy, ModifyInstanceAttribute, AuthorizeSecurityGroupIngress,
    GetObject, PutObject, etc.
  - Data events: S3 GetObject / PutObject / DeleteObject
"""

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict

from services.ingestion.adapters.base import BaseAdapter


class AWSCloudTrailAdapter(BaseAdapter):
    SOURCE_PRODUCT = "AWS CloudTrail"

    # CloudTrail eventName prefix → OCSF class
    CLASS_PREFIXES = {
        "ConsoleLogin": "Authentication",
        "AssumeRole": "Authentication",
        "CreateUser": "SystemActivity",
        "DeleteUser": "SystemActivity",
        "AttachRolePolicy": "PolicyChange",
        "DetachRolePolicy": "PolicyChange",
        "PutRolePolicy": "PolicyChange",
        "DeleteRolePolicy": "PolicyChange",
        "AuthorizeSecurityGroupIngress": "PolicyChange",
        "RevokeSecurityGroupIngress": "PolicyChange",
        "ModifyInstanceAttribute": "SystemActivity",
        "GetObject": "CloudActivity",
        "PutObject": "CloudActivity",
        "DeleteObject": "CloudActivity",
        "CreateBucket": "CloudActivity",
        "DeleteBucket": "CloudActivity",
        "StartInstances": "SystemActivity",
        "StopInstances": "SystemActivity",
        "TerminateInstances": "SystemActivity",
    }

    ACTIVITY_MAP = {
        "ConsoleLogin": "Logon",
        "AssumeRole": "TokenGeneration",
        "CreateUser": "AccountCreate",
        "DeleteUser": "AccountDelete",
        "AttachRolePolicy": "PolicyAttach",
        "DetachRolePolicy": "PolicyDetach",
        "PutRolePolicy": "PolicyChange",
        "AuthorizeSecurityGroupIngress": "PolicyChange",
        "RevokeSecurityGroupIngress": "PolicyChange",
        "GetObject": "FileAccess",
        "PutObject": "FileWrite",
        "DeleteObject": "FileDelete",
    }

    @classmethod
    def can_handle(cls, raw: Dict[str, Any]) -> bool:
        """CloudTrail records have 'eventSource' and 'eventName'."""
        return (
            "eventSource" in raw
            and "eventName" in raw
            and "awsRegion" in raw
        )

    def to_ocsf_fields(self, raw: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        event_name = raw.get("eventName", "")
        error_code = raw.get("errorCode")

        # Timestamp
        event_time = raw.get("eventTime", datetime.utcnow().isoformat())
        try:
            time_observed = datetime.fromisoformat(event_time.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            time_observed = datetime.utcnow()

        # Determine event class
        event_class = "CloudActivity"
        for prefix, cls_name in self.CLASS_PREFIXES.items():
            if event_name.startswith(prefix):
                event_class = cls_name
                break

        # Activity name
        activity_name = self.ACTIVITY_MAP.get(event_name, event_name or "UnknownActivity")

        # Outcome
        outcome = "Failure" if error_code else "Success"

        # Actor: IAM identity (UNTRUSTED fields go into extras)
        user_identity = raw.get("userIdentity", {})
        actor = {
            "user_name": (
                user_identity.get("userName")
                or user_identity.get("principalId")
                or user_identity.get("arn", "").split("/")[-1]
            ),
            "user_uid": user_identity.get("accountId"),
            "session_uid": raw.get("requestID"),
            "ip_addr": raw.get("sourceIPAddress"),
            "user_agent": raw.get("userAgent"),  # untrusted
            "extras": {
                "identity_type": user_identity.get("type"),
                "assumed_role_arn": user_identity.get("arn"),
                "mfa_authenticated": (
                    raw.get("additionalEventData", {})
                    .get("MFAAuthenticated", "false")
                ),
            },
        }

        # Target: AWS resource
        request_params = raw.get("requestParameters") or {}
        resources = raw.get("resources") or []
        primary_resource = resources[0] if resources else {}
        target = {
            "resource_name": (
                primary_resource.get("ARN")
                or request_params.get("bucketName")
                or request_params.get("instanceId")
                or event_name
            ),
            "resource_type": primary_resource.get("type") or raw.get("eventSource", ""),
            "resource_uid": primary_resource.get("accountId"),
            "extras": {
                "region": raw.get("awsRegion"),
                "error_code": error_code,
                "error_message": raw.get("errorMessage"),
                "request_id": raw.get("requestID"),
            },
        }

        return {
            "tenant_id": tenant_id,
            "source_product": self.SOURCE_PRODUCT,
            "source_event_id": raw.get("eventID", raw.get("requestID", "")),
            "event_class": event_class,
            "activity_name": activity_name,
            "outcome": outcome,
            "time_observed": time_observed,
            "actor": actor,
            "target": target,
        }
