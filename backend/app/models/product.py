from __future__ import annotations

from tortoise import fields

from app.models.base import BaseModel


class Product(BaseModel):
    id = fields.IntField(primary_key=True)
    tenant: fields.ForeignKeyRelation["Tenant"] = fields.ForeignKeyField(  # noqa: F821
        "models.Tenant", related_name="products", on_delete=fields.CASCADE
    )
    name = fields.CharField(max_length=180, db_index=True)
    price = fields.FloatField(default=0)
    description = fields.TextField(null=True)
    image_url = fields.CharField(max_length=512, null=True)
    is_active = fields.BooleanField(default=True)

    category_links: fields.ReverseRelation["ProductCategory"]
    variations: fields.ReverseRelation["ProductVariation"]
    images: fields.ReverseRelation["ProductImage"]

    class Meta:
        table = "products"


class ProductCategory(BaseModel):
    product: fields.ForeignKeyRelation[Product] = fields.ForeignKeyField(
        "models.Product", related_name="category_links", on_delete=fields.CASCADE
    )
    category: fields.ForeignKeyRelation["Category"] = fields.ForeignKeyField(  # noqa: F821
        "models.Category", related_name="product_links", on_delete=fields.CASCADE
    )
    tenant: fields.ForeignKeyRelation["Tenant"] = fields.ForeignKeyField(  # noqa: F821
        "models.Tenant", related_name="product_categories", on_delete=fields.CASCADE
    )

    class Meta:
        table = "product_categories"
        unique_together = [("product_id", "category_id")]
        pk_constraint_name = "uq_product_categories_pair"


class ProductImage(BaseModel):
    id = fields.IntField(primary_key=True)
    tenant: fields.ForeignKeyRelation["Tenant"] = fields.ForeignKeyField(  # noqa: F821
        "models.Tenant", related_name="product_images", on_delete=fields.CASCADE
    )
    product: fields.ForeignKeyRelation[Product] = fields.ForeignKeyField(
        "models.Product", related_name="images", on_delete=fields.CASCADE
    )
    url = fields.CharField(max_length=512)
    sort_order = fields.IntField(default=0)

    class Meta:
        table = "product_images"
        unique_together = [("product_id", "tenant_id", "sort_order")]


class ProductVariation(BaseModel):
    id = fields.IntField(primary_key=True)
    product: fields.ForeignKeyRelation[Product] = fields.ForeignKeyField(
        "models.Product", related_name="variations", on_delete=fields.CASCADE
    )
    size = fields.CharField(max_length=64, null=True)
    color = fields.CharField(max_length=64, null=True)
    quantity = fields.IntField(default=0)

    class Meta:
        table = "product_variations"
