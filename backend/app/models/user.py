from __future__ import annotations

from tortoise import fields

from app.core.security import hash_password
from app.models.base import BaseModel


class User(BaseModel):
    id = fields.IntField(primary_key=True)
    email = fields.CharField(max_length=255, unique=True, db_index=True)
    first_name = fields.CharField(max_length=120, null=True)
    last_name = fields.CharField(max_length=120, null=True)
    password_hash = fields.CharField(max_length=255)
    tenant: fields.ForeignKeyRelation["Tenant"] = fields.ForeignKeyField(  # noqa: F821
        "models.Tenant", related_name="users", on_delete=fields.CASCADE
    )
    is_active = fields.BooleanField(default=True)

    class Meta:
        table = "users"

    def set_password(self, plain_password: str) -> None:
        self.password_hash = hash_password(plain_password)
