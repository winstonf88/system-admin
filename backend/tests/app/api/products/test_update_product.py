import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("invalid_price", [0, -1, -0.01])
async def test_update_product_rejects_zero_or_negative_price(
    client, invalid_price: float
) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="Roupas")
    product = await create_product(tenant_id=t1.id, name="Camisa")
    await ProductCategory.create(product_id=product.id, tenant_id=t1.id, category_id=category.id)

    updated = await client.put(
        f"/api/products/{product.id}",
        auth=AUTH_TENANT_ONE,
        json={"price": invalid_price},
    )
    assert updated.status_code == 422
    body = updated.json()
    assert any(error.get("loc") == ["body", "price"] for error in body.get("detail", []))
