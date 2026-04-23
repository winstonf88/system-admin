from __future__ import annotations

from tortoise import fields

from app.models.base import BaseModel
from app.models.tenant_config import TenantConfig


class Tenant(BaseModel):
    id = fields.IntField(primary_key=True)
    slug = fields.CharField(max_length=80, unique=True, db_index=True)
    name = fields.CharField(max_length=180)
    is_active = fields.BooleanField(default=True)
    config: fields.JSONField = fields.JSONField(default=dict)
    api_key_hash = fields.CharField(max_length=64, null=True, db_index=True)

    users: fields.ReverseRelation["User"]  # noqa: F821

    class Meta:
        table = "tenants"

    def get_config(self) -> TenantConfig:
        raw = self.config or {}
        return TenantConfig.model_validate(raw)

    def set_config(self, value: TenantConfig) -> None:
        self.config = value.model_dump(mode="json")
