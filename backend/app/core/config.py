import json
from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = Field(
        default="system-admin API", validation_alias=AliasChoices("APP_NAME")
    )
    app_env: Literal["local", "staging", "production", "test"] = Field(
        default="local", validation_alias=AliasChoices("APP_ENV")
    )
    app_debug: bool = Field(default=False, validation_alias=AliasChoices("APP_DEBUG"))
    app_host: str = Field(default="0.0.0.0", validation_alias=AliasChoices("APP_HOST"))
    app_port: int = Field(default=8000, validation_alias=AliasChoices("APP_PORT"))
    app_log_level: str = Field(
        default="INFO", validation_alias=AliasChoices("APP_LOG_LEVEL")
    )
    # Env must be read as str: pydantic-settings JSON-decodes list fields before validators run,
    # which breaks comma-separated URLs, JSON arrays without quotes, and empty values.
    cors_origins_env: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("APP_CORS_ORIGINS"),
        exclude=True,
    )
    app_expose_docs: bool = Field(
        default=True, validation_alias=AliasChoices("APP_EXPOSE_DOCS")
    )
    app_enable_admin: bool = Field(
        default=False, validation_alias=AliasChoices("APP_ENABLE_ADMIN")
    )
    database_url: str = Field(
        default="asyncpg://postgres:postgres@localhost:5432/system_admin",
        validation_alias=AliasChoices("DATABASE_URL", "APP_DATABASE_URL"),
    )

    secret_key: str = Field(
        default="change-me-in-production",
        validation_alias=AliasChoices("SECRET_KEY"),
    )
    openai_api_key: str | None = Field(
        default=None, validation_alias=AliasChoices("OPENAI_API_KEY")
    )
    openai_model: str = Field(
        default="gpt-4o", validation_alias=AliasChoices("OPENAI_MODEL")
    )

    storage_backend: Literal["local", "spaces"] = Field(
        default="local", validation_alias=AliasChoices("STORAGE_BACKEND")
    )
    spaces_key: str | None = Field(
        default=None, validation_alias=AliasChoices("SPACES_KEY")
    )
    spaces_secret: str | None = Field(
        default=None, validation_alias=AliasChoices("SPACES_SECRET")
    )
    spaces_region: str = Field(
        default="nyc3", validation_alias=AliasChoices("SPACES_REGION")
    )
    spaces_bucket: str | None = Field(
        default=None, validation_alias=AliasChoices("SPACES_BUCKET")
    )
    spaces_cdn_endpoint: str | None = Field(
        default=None, validation_alias=AliasChoices("SPACES_CDN_ENDPOINT")
    )

    @computed_field
    @property
    def app_cors_origins(self) -> list[str]:
        raw = self.cors_origins_env.strip()
        if not raw:
            return ["http://localhost:3000"]
        if raw.startswith("["):
            parsed = json.loads(raw)
            if not isinstance(parsed, list):
                raise ValueError(
                    "APP_CORS_ORIGINS must be a JSON array when it starts with '['"
                )
            return [str(x).strip() for x in parsed if str(x).strip()]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
