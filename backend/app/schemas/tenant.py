from pydantic import BaseModel, ConfigDict, Field

from app.models.tenant_config import TenantConfig


class TenantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    is_active: bool
    config: TenantConfig


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    config: TenantConfig | None = None
