from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.tenant_config import TenantConfig


class TenantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    is_active: bool
    config: TenantConfig

    @field_validator("config", mode="before")
    @classmethod
    def coerce_config(cls, v: Any) -> TenantConfig:
        if isinstance(v, TenantConfig):
            return v
        if v is None:
            return TenantConfig()
        return TenantConfig.model_validate(v)


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    config: TenantConfig | None = None
