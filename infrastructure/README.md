# AegisCore AI Infrastructure

This directory contains Docker Compose configuration and database initialisation scripts.

## Quick Start

### Prerequisites
- Docker Desktop (Windows) with WSL2 backend
- At least 4 GB RAM allocated to Docker

### Start all services

```bash
cd infrastructure
docker compose up -d
```

This will start:

| Service | Port | Description |
|---|---|---|
| PostgreSQL | `5432` | Incidents, events, audit log |
| Neo4j | `7474` (UI), `7687` (Bolt) | Asset dependency graph |
| Redis | `6379` | Deduplication, rate limiting, cache |
| MinIO | `9000` (API), `9001` (Console) | Immutable raw event archive |
| AegisCore API | `8000` | FastAPI control plane |

### Service UIs (Development)

| Service | URL | Credentials |
|---|---|---|
| Neo4j Browser | http://localhost:7474 | `neo4j` / `aegiscore_neo4j_secret` |
| MinIO Console | http://localhost:9001 | `aegiscore_minio` / `aegiscore_minio_secret` |
| FastAPI Docs | http://localhost:8000/docs | N/A |
| FastAPI ReDoc | http://localhost:8000/redoc | N/A |

### Stop all services

```bash
docker compose down
```

### Reset (delete all data volumes)

```bash
docker compose down -v
```

## Phase 2: Testing Ingestion

Once infrastructure is running, test the ingestion pipeline:

```bash
# From repo root — install Python deps first:
pip install pydantic>=2.7 structlog

# Run synthetic event generator in direct mode (no DB required):
python services/ingestion/generator/runner.py --mode direct --all --verbose

# Send all 7 test scenarios to the live API:
python services/ingestion/generator/runner.py --mode api --url http://localhost:8000 --all
```

### Expected output (direct mode)
```
Total:    14
Accepted: 12
Rejected: 1  (prompt injection — adapter accepted but validator may flag)
Duplicate: 1 (scenario 6 duplicate replay)
```

## Architecture Notes

- **PostgreSQL schema**: `aegiscore` (separate from `public`). See [postgres/init.sql](postgres/init.sql).
- **MinIO buckets** (created by `minio-init` container on first start):
  - `aegiscore-raw-events` — immutable raw payload archive
  - `aegiscore-dead-letter` — failed/rejected events for replay
  - `aegiscore-audit-exports` — exported audit logs
- **Redis** uses `allkeys-lru` eviction (256 MB cap). Dedup TTL = 24 h.
