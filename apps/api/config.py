"""
AegisCore AI – Application Configuration
Reads from environment variables; safe defaults for development.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    AEGISCORE_ENV: str = "development"
    TENANT_ID: str = "tenant-aegis-production-us-east"

    # PostgreSQL
    DATABASE_URL: str = (
        "postgresql+asyncpg://aegiscore:aegiscore_dev_secret@localhost:5432/aegiscore"
    )

    # Redis
    REDIS_URL: str = "redis://:aegiscore_redis_secret@localhost:6379/0"
    REDIS_DEDUP_TTL_SECONDS: int = 86_400        # 24 h dedup window
    REDIS_IDEMPOTENCY_TTL_SECONDS: int = 3_600   # 1 h action lock TTL

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "aegiscore_minio"
    MINIO_SECRET_KEY: str = "aegiscore_minio_secret"
    MINIO_SECURE: bool = False
    MINIO_RAW_BUCKET: str = "aegiscore-raw-events"
    MINIO_DLQ_BUCKET: str = "aegiscore-dead-letter"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "aegiscore_neo4j_secret"

    # Clock-skew tolerance for event deduplication
    MAX_EVENT_CLOCK_SKEW_SECONDS: int = 300   # 5 minutes


settings = Settings()
