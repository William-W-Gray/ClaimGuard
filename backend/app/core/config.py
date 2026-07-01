"""Application configuration — 12-factor, env-driven, validated once at import."""
from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["development", "staging", "production", "test"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────────────
    app_name: str = "ClaimGuard 360°"
    environment: Environment = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    version: str = "1.0.0"

    # ── Logging ────────────────────────────────────────────────────────────
    log_level: str = "INFO"
    log_json: bool = False

    # ── Server ─────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── Security ───────────────────────────────────────────────────────────
    jwt_secret_key: str = "change-me-dev-secret-do-not-use-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # NoDecode: keep pydantic-settings from JSON-parsing the env value; the
    # validator below splits a comma-separated string instead.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )
    rate_limit_per_minute: int = 120

    # ── Database ───────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://claimguard:claimguard@localhost:5432/claimguard"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # ── Redis / Celery ─────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # ── Demo / seed ────────────────────────────────────────────────────────
    demo_mode: bool = True
    seed_on_startup: bool = False
    first_admin_email: str = "admin@claimguard.co.zw"
    first_admin_password: str = "ChangeMe!2026"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
