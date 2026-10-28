"""
AegisCore AI – Mock data bridging dashboard mocks to API layer.
Mirrors apps/dashboard/src/mocks/*.mock.ts until the DB is fully seeded.
"""

MOCK_METRICS = {
    "events_per_sec": 847,
    "event_lag_seconds": 1.2,
    "unresolved_uncertainty_count": 3,
    "verified_containment_rate_pct": 94.7,
    "dead_letter_count": 12,
    "connectors": [
        {"name": "Okta Identity", "type": "idp", "status": "healthy", "latency_ms": 42, "error_rate_pct": 0.1, "last_sync": "2026-10-27T09:58:00Z"},
        {"name": "CrowdStrike Falcon", "type": "edr", "status": "healthy", "latency_ms": 78, "error_rate_pct": 0.0, "last_sync": "2026-10-27T09:59:30Z"},
        {"name": "AWS CloudTrail", "type": "cloud", "status": "degraded", "latency_ms": 310, "error_rate_pct": 2.4, "last_sync": "2026-10-27T09:55:00Z"},
        {"name": "Palo Alto NGFW", "type": "network", "status": "healthy", "latency_ms": 55, "error_rate_pct": 0.0, "last_sync": "2026-10-27T09:59:00Z"},
    ],
    "incidents_by_severity": {"critical": 1, "high": 3, "medium": 8, "low": 14},
}

MOCK_INCIDENTS = [
    {
        "id": "INC-2026-8841",
        "tenant_id": "tenant-aegis-production-us-east",
        "title": "Suspicious Token Refresh Sequence: Credential Re-use from Anomalous External IP",
        "status": "PENDING_APPROVAL",
        "severity": "CRITICAL",
        "created_at": "2026-10-27T08:14:52Z",
        "updated_at": "2026-10-27T09:41:18Z",
        "scores": {
            "anomaly_score": 0.91,
            "threat_confidence": 0.78,
            "business_impact": 0.85,
            "action_risk": 0.42,
            "evidence_sufficiency": 0.88,
        },
        "affected_entities": [
            {"id": "usr-0042", "name": "michael.chen@corp.internal", "type": "user", "criticality": "Tier 1"},
            {"id": "svc-auth-01", "name": "auth-service", "type": "service", "criticality": "Tier 1"},
            {"id": "db-users-01", "name": "users-postgres", "type": "database", "criticality": "Tier 1"},
        ],
        "claims": [
            {"id": "clm-001", "text": "Token refresh observed from external IP 185.220.101.47 (Tor exit node).", "is_inference": False, "source_ref": {"event_id": "evt-okta-001", "source_product": "Okta Identity", "time_observed": "2026-10-27T08:14:52Z"}},
            {"id": "clm-002", "text": "Same credential used from corporate VPN 10.0.1.88 3 minutes earlier.", "is_inference": False, "source_ref": {"event_id": "evt-okta-002", "source_product": "Okta Identity", "time_observed": "2026-10-27T08:11:44Z"}},
            {"id": "clm-003", "text": "Threat actor likely possesses persistent refresh credentials.", "is_inference": True},
        ],
        "evidence": [
            {"id": "evt-okta-001", "type": "idp", "source_product": "Okta Identity", "event_id": "evt-okta-001", "observed_at": "2026-10-27T08:14:52Z", "summary": "Token refresh from Tor exit node", "is_corroborating": True, "is_contradicting": False, "freshness_minutes": 4, "raw_payload": '{"actor":"michael.chen","ip":"185.220.101.47","ua":"curl/7.88.1"}', "is_untrusted": True, "fields": {"ip": "185.220.101.47", "risk_score": 98}},
            {"id": "evt-cs-002", "type": "edr", "source_product": "CrowdStrike Falcon", "event_id": "evt-cs-002", "observed_at": "2026-10-27T08:13:10Z", "summary": "Credential dump process spawned on WKSTN-0042", "is_corroborating": True, "is_contradicting": False, "freshness_minutes": 5, "raw_payload": '{"pid":4821,"process":"lsass.exe","parent":"cmd.exe"}', "is_untrusted": True, "fields": {"severity": "high", "technique": "T1003"}},
        ],
        "candidate_actions": [
            {"action_id": "act-001", "action_type": "RevokeUserSession", "name": "Revoke All Active Sessions for michael.chen", "tier": 2, "target_entity_id": "usr-0042", "target_entity_name": "michael.chen@corp.internal", "target_entity_type": "user", "predicted_blast_radius": [], "reversibility_score": 0.95, "required_evidence_predicates": ["active_session_confirmed", "external_ip_flagged"], "security_gain": 0.85, "business_disruption_cost": 0.10, "parameters": {"user_id": "usr-0042", "scope": "all_sessions"}, "policy_version": "v1.0.0"},
            {"action_id": "act-002", "action_type": "IsolateEndpoint", "name": "Network-Isolate Endpoint WKSTN-0042", "tier": 2, "target_entity_id": "ep-wkstn-0042", "target_entity_name": "WKSTN-0042", "target_entity_type": "endpoint", "predicted_blast_radius": ["svc-auth-01"], "reversibility_score": 0.70, "required_evidence_predicates": ["credential_dump_confirmed", "lateral_movement_evidence"], "security_gain": 0.92, "business_disruption_cost": 0.55, "parameters": {"device_id": "ep-wkstn-0042"}, "policy_version": "v1.0.0"},
        ],
        "contradictions_and_unknowns": {
            "contradictions": ["Successful MFA challenge at 08:11 from corporate IP creates ambiguity about session hijack timing."],
            "data_gaps": ["No EDR telemetry from the external IP source host.", "AWS CloudTrail data lag of 4m may obscure concurrent cloud API calls."],
            "unverified_assumptions": ["Assumed Tor exit node implies malicious actor; may be privacy-conscious legitimate user."],
        },
        "agent_traces": [
            {"agent": "Sentry", "timestamp": "2026-10-27T08:15:01Z", "observation": "Anomaly score 0.91 triggered by geographic velocity violation (185km in 3 min). Threshold: 0.85."},
            {"agent": "Investigator", "timestamp": "2026-10-27T08:17:33Z", "observation": "Correlated Okta token event with CrowdStrike credential dump process on WKSTN-0042. 2 corroborating evidence items found."},
            {"agent": "Validator", "timestamp": "2026-10-27T08:22:10Z", "observation": "Evidence sufficiency: 0.88. Contradiction flagged: concurrent MFA success. Mandatory predicates: PASSED."},
            {"agent": "Planner", "timestamp": "2026-10-27T08:25:44Z", "observation": "Ranked 2 candidate actions. act-001 (session revocation) preferred: security_gain/disruption ratio = 8.5 vs 1.67 for act-002."},
        ],
    }
]
