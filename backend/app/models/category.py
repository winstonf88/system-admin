from __future__ import annotations

from tortoise import fields
from tortoise.indexes import Index

from app.models.base import BaseModel


class Category(BaseModel):
    id = fields.IntField(primary_key=True)
    tenant: fields.ForeignKeyRelation["Tenant"] = fields.ForeignKeyField(  # noqa: F821
        "models.Tenant", related_name="categories", on_delete=fields.CASCADE
    )
    name = fields.CharField(max_length=120)
    parent: fields.ForeignKeyNullableRelation["Category"] = fields.ForeignKeyField(
        "models.Category",
        related_name="subcategories",
        null=True,
        on_delete=fields.RESTRICT,
    )
    sort_order = fields.IntField(default=0)
    is_active = fields.BooleanField(default=True)

    subcategories: fields.ReverseRelation["Category"]
    product_links: fields.ReverseRelation["ProductCategory"]  # noqa: F821

    class Meta:
        table = "categories"
        indexes = [
            Index(fields=("tenant_id", "name", "parent_id"), name="uq_category_tenant_name_parent"),
        ]
        unique_together = [("tenant_id", "name", "parent_id")]
