"""
AegisCore AI – Okta Identity Provider Adapter

Handles Okta System Log events (System Log API v1 format).
Maps to OCSF Authentication class events.

Supported event types:
  - user.authentication.sso
  - user.session.start
  - user.authentication.auth_via_mfa
  - user.session.end
  - user.account.lock
  - policy.evaluate_sign_on
"""

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict

from services.ingestion.adapters.base import BaseAdapter


class OktaIdPAdapter(BaseAdapter):
    SOURCE_PRODUCT = "Okta Identity"

    # Okta activity → OCSF activity_name mapping
    ACTIVITY_MAP = {
        "user.authentication.sso": "Logon",
        "user.session.start": "Logon",
        "user.authentication.auth_via_mfa": "MFAChallenge",
        "user.session.end": "Logoff",
        "user.account.lock": "AccountLock",
        "policy.evaluate_sign_on": "PolicyEvaluation",
        "user.authentication.auth_via_radius": "Logon",
        "user.authentication.auth_via_ldap": "Logon",
        "token.refresh": "TokenGeneration",
    }

    OUTCOME_MAP = {
        "SUCCESS": "Success",
        "FAILURE": "Failure",
        "SKIPPED": "Unknown",
        "ALLOW": "Success",
        "DENY": "Failure",
    }

    @classmethod
    def can_handle(cls, raw: Dict[str, Any]) -> bool:
        """Okta events have 'eventType' and 'displayMessage' at top level."""
        return (
            "eventType" in raw
            and ("displayMessage" in raw or "actor" in raw)
            and "outcome" in raw
        )

    def to_ocsf_fields(self, raw: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        event_type = raw.get("eventType", "unknown")
        okta_outcome = raw.get("outcome", {})
        outcome_result = okta_outcome.get("result", "UNKNOWN")

        # Parse timestamp
        published = raw.get("published", raw.get("timestamp", datetime.utcnow().isoformat()))
        try:
            time_observed = datetime.fromisoformat(published.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            time_observed = datetime.utcnow()

        # Actor mapping (UNTRUSTED – goes into sub-model, not top-level)
        okta_actor = raw.get("actor", {})
        actor = {
            "user_name": okta_actor.get("login") or okta_actor.get("displayName"),
            "user_uid": okta_actor.get("id"),
            "user_agent": (
                raw.get("client", {}).get("userAgent", {}).get("rawUserAgent")
            ),
            "ip_addr": raw.get("client", {}).get("ipAddress"),
            "extras": {
                "actor_type": okta_actor.get("type"),
                "session_id": raw.get("authenticationContext", {}).get("externalSessionId"),
            },
        }

        # Target mapping
        okta_targets = raw.get("target", [])
        target_resource = okta_targets[0] if okta_targets else {}
        target = {
            "resource_name": target_resource.get("displayName") or target_resource.get("login"),
            "resource_type": target_resource.get("type"),
            "resource_uid": target_resource.get("id"),
            "extras": {"target_count": len(okta_targets)},
        }

        # Network context
        client = raw.get("client", {})
        network = {
            "src_ip": client.get("ipAddress"),
            "direction": "inbound",
            "extras": {
                "geo_city": client.get("geographicalContext", {}).get("city"),
                "geo_country": client.get("geographicalContext", {}).get("country"),
                "zone": client.get("zone"),
            },
        }

        return {
            "tenant_id": tenant_id,
            "source_product": self.SOURCE_PRODUCT,
            "source_event_id": raw.get("uuid", raw.get("eventId", "")),
            "event_class": "Authentication",
            "activity_name": self.ACTIVITY_MAP.get(event_type, "Logon"),
            "outcome": self.OUTCOME_MAP.get(outcome_result, "Unknown"),
            "time_observed": time_observed,
            "actor": actor,
            "target": target,
            "network": network,
        }
