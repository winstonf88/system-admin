import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_product_lookup_blocks_cross_tenant_access(client) -> None:
    await seed_two_tenant_users()
    t2 = await Tenant.get(slug="t2")
    tenant2_category = await create_category(tenant_id=t2.id, name="T2 Cat")
    tenant2_product = await create_product(tenant_id=t2.id, name="Tenant 2 Product")
    await ProductCategory.create(
        product_id=tenant2_product.id,
        tenant_id=t2.id,
        category_id=tenant2_category.id,
    )

    response = await client.get(f"/api/products/{tenant2_product.id}", auth=AUTH_TENANT_ONE)
    assert response.status_code == 404
