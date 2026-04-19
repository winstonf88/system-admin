from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = Field(default="system-admin API", validation_alias=AliasChoices("APP_NAME"))
    app_env: Literal["local", "staging", "production", "test"] = Field(
        default="local", validation_alias=AliasChoices("APP_ENV")
    )
    app_debug: bool = Field(default=False, validation_alias=AliasChoices("APP_DEBUG"))
    app_host: str = Field(default="0.0.0.0", validation_alias=AliasChoices("APP_HOST"))
    app_port: int = Field(default=8000, validation_alias=AliasChoices("APP_PORT"))
    app_log_level: str = Field(default="INFO", validation_alias=AliasChoices("APP_LOG_LEVEL"))
    app_cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        validation_alias=AliasChoices("APP_CORS_ORIGINS"),
    )
    app_expose_docs: bool = Field(default=True, validation_alias=AliasChoices("APP_EXPOSE_DOCS"))
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/system_admin",
        validation_alias=AliasChoices("DATABASE_URL", "APP_DATABASE_URL"),
    )
    db_pool_size: int = Field(default=10, validation_alias=AliasChoices("DB_POOL_SIZE"))
    db_max_overflow: int = Field(default=20, validation_alias=AliasChoices("DB_MAX_OVERFLOW"))
    db_pool_timeout: int = Field(default=30, validation_alias=AliasChoices("DB_POOL_TIMEOUT"))
    db_pool_recycle: int = Field(default=1800, validation_alias=AliasChoices("DB_POOL_RECYCLE"))

    @field_validator("app_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
