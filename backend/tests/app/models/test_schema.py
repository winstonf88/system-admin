from app.models import Category, Product, ProductVariation, User


def test_schema_has_tenant_columns_and_constraints() -> None:
    category_cols = Category.__table__.c
    product_cols = Product.__table__.c
    user_cols = User.__table__.c

    assert "tenant_id" in category_cols
    assert "tenant_id" in product_cols
    assert "tenant_id" not in ProductVariation.__table__.c
    assert not category_cols["tenant_id"].nullable
    assert not product_cols["tenant_id"].nullable

    assert "email" in user_cols
    assert user_cols["email"].unique
    assert "first_name" in user_cols
    assert user_cols["first_name"].nullable
    assert "last_name" in user_cols
    assert user_cols["last_name"].nullable
    assert "password_hash" in user_cols
    assert "is_active" in user_cols
    assert not user_cols["tenant_id"].nullable

    category_unique_sets = [
        tuple(column.name for column in constraint.columns)
        for constraint in Category.__table__.constraints
        if constraint.__class__.__name__ == "UniqueConstraint"
    ]
    assert ("tenant_id", "name", "parent_id") in category_unique_sets
