-- =============================================================
-- AegisCore AI – PostgreSQL Initialisation Script
-- =============================================================
-- Executed once by the postgres Docker container on first start.

-- ──────────────────────────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fast LIKE / similarity search

-- ──────────────────────────────────────────────────────────────
-- Schema: aegiscore (logical namespace)
-- ──────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS aegiscore;
SET search_path TO aegiscore, public;

-- ──────────────────────────────────────────────────────────────
-- Table: ocsf_events
-- Normalised telemetry events (one row per source log entry)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ocsf_events (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id         TEXT        NOT NULL UNIQUE,   -- AegisCore-assigned UUID
    tenant_id        TEXT        NOT NULL,
    source_product   TEXT        NOT NULL,          -- e.g. "Okta", "CrowdStrike"
    source_event_id  TEXT        NOT NULL,          -- original vendor event ID
    event_class      TEXT        NOT NULL,          -- OCSF class name
    activity_name    TEXT        NOT NULL,
    outcome          TEXT        NOT NULL,
    time_observed    TIMESTAMPTZ NOT NULL,
    time_ingested    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_event_ref    TEXT        NOT NULL,          -- s3://bucket/path SHA hash
    raw_sha256       TEXT        NOT NULL,          -- integrity hash
    actor_json       JSONB,
    target_json      JSONB,
    device_json      JSONB,
    network_json     JSONB,
    schema_version   TEXT        NOT NULL DEFAULT '1.1.0',
    parser_version   TEXT        NOT NULL DEFAULT '1.0.0',
    incident_id      TEXT,                          -- FK link when correlated
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_tenant        ON ocsf_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_source        ON ocsf_events (source_product);
CREATE INDEX IF NOT EXISTS idx_events_class         ON ocsf_events (event_class);
CREATE INDEX IF NOT EXISTS idx_events_time_observed ON ocsf_events (time_observed DESC);
CREATE INDEX IF NOT EXISTS idx_events_incident      ON ocsf_events (incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_actor_gin     ON ocsf_events USING GIN (actor_json);

-- ──────────────────────────────────────────────────────────────
-- Table: dead_letter_events
-- Events that failed validation (stored for review & replay)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dead_letter_events (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT,
    source_product  TEXT,
    raw_payload     JSONB       NOT NULL,
    raw_sha256      TEXT,
    failure_reason  TEXT        NOT NULL,
    failure_code    TEXT        NOT NULL,
    dlq_ref         TEXT,                           -- MinIO DLQ path
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retry_count     INT         NOT NULL DEFAULT 0,
    resolved        BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_dlq_tenant  ON dead_letter_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_dlq_product ON dead_letter_events (source_product);

-- ──────────────────────────────────────────────────────────────
-- Table: incidents
-- Incident dossier lifecycle tracking
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id                         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id                TEXT        NOT NULL UNIQUE,   -- INC-YYYY-NNNN
    tenant_id                  TEXT        NOT NULL,
    status                     TEXT        NOT NULL DEFAULT 'NEW',
    severity                   TEXT        NOT NULL DEFAULT 'MEDIUM',
    title                      TEXT        NOT NULL,
    -- 5D Scoring (stored as individual columns for query efficiency)
    score_anomaly              FLOAT,
    score_threat_confidence    FLOAT,
    score_business_impact      FLOAT,
    score_action_risk          FLOAT,
    score_evidence_sufficiency FLOAT,
    -- Relationships
    trigger_event_ids          TEXT[]      NOT NULL DEFAULT '{}',
    affected_entity_ids        TEXT[]      NOT NULL DEFAULT '{}',
    -- Approval
    policy_version             TEXT        NOT NULL DEFAULT 'v1.0.0',
    approver_identity          TEXT,
    approver_role              TEXT,
    approval_timestamp         TIMESTAMPTZ,
    approval_reason            TEXT,
    target_hash                TEXT,
    parameters_hash            TEXT,
    approval_expiry            TIMESTAMPTZ,
    approval_invalidated       BOOLEAN     NOT NULL DEFAULT FALSE,
    -- Execution & Verification
    selected_action_id         TEXT,
    execution_status           TEXT,
    execution_result           JSONB,
    postcondition_verified     BOOLEAN,
    service_health_passed      BOOLEAN,
    verification_details       TEXT,
    -- Audit
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_tenant    ON incidents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status    ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity  ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created   ON incidents (created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- Table: audit_log
-- Append-only, tamper-evident audit record
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT        NOT NULL,
    incident_id     TEXT,
    event_type      TEXT        NOT NULL,   -- e.g. INGESTION, APPROVAL, EXECUTION, VERIFICATION
    actor           TEXT        NOT NULL,   -- system component or human identity
    payload         JSONB       NOT NULL,
    entry_hash      TEXT        NOT NULL,   -- SHA-256(prev_hash + payload)
    prev_hash       TEXT        NOT NULL DEFAULT 'GENESIS',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log is append-only: no UPDATE or DELETE privileges granted
CREATE INDEX IF NOT EXISTS idx_audit_tenant    ON audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_incident  ON audit_log (incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_type      ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log (created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- Table: idempotency_keys
-- Redis-backed distributed lock fallback (persisted)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key         TEXT        PRIMARY KEY,
    incident_id TEXT        NOT NULL,
    action_id   TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'PROCESSING',
    result      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idemp_incident ON idempotency_keys (incident_id);
CREATE INDEX IF NOT EXISTS idx_idemp_expires  ON idempotency_keys (expires_at);

-- ──────────────────────────────────────────────────────────────
-- Auto-update updated_at trigger
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- Seed: Default tenant configuration
-- ──────────────────────────────────────────────────────────────
INSERT INTO incidents (incident_id, tenant_id, status, severity, title, trigger_event_ids)
VALUES (
    'INC-2026-8841',
    'tenant-aegis-production-us-east',
    'PENDING_APPROVAL',
    'CRITICAL',
    'Suspicious Token Refresh Sequence: Credential Re-use from Anomalous External IP',
    ARRAY['evt-okta-001', 'evt-cs-002', 'evt-ct-003']
) ON CONFLICT (incident_id) DO NOTHING;
