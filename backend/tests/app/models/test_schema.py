from tortoise import fields

from app.models import Category, Product, ProductVariation, Tenant, User


def test_schema_has_expected_fields() -> None:
    category_fields = Category._meta.fields_map
    product_fields = Product._meta.fields_map
    user_fields = User._meta.fields_map
    tenant_fields = Tenant._meta.fields_map
    variation_fields = ProductVariation._meta.fields_map

    assert "tenant_id" in category_fields
    assert "tenant_id" in product_fields
    assert "tenant_id" not in variation_fields

    assert "email" in user_fields
    assert "first_name" in user_fields
    assert "last_name" in user_fields
    assert "password_hash" in user_fields
    assert "is_active" in user_fields
    assert "tenant_id" in user_fields

    assert "is_active" in tenant_fields
    assert "config" in tenant_fields

    assert isinstance(user_fields["email"], fields.CharField)
    assert isinstance(user_fields["first_name"], fields.CharField)
    assert user_fields["first_name"].null is True
    assert isinstance(user_fields["last_name"], fields.CharField)
    assert user_fields["last_name"].null is True

    unique_together = Category._meta.unique_together
    assert ("tenant_id", "name", "parent_id") in unique_together
