import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_delete_product_image(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="T1 Cat")
    product = await create_product(tenant_id=t1.id, name="Tenant 1 Product")
    await ProductCategory.create(product_id=product.id, tenant_id=t1.id, category_id=category.id)

    await client.post(
        f"/api/products/{product.id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("image.png", b"fake-bytes", "image/png")},
    )
    await client.post(
        f"/api/products/{product.id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("second.jpg", b"more-bytes", "image/jpeg")},
    )

    detail = await client.get(f"/api/products/{product.id}", auth=AUTH_TENANT_ONE)
    assert detail.status_code == 200
    body = detail.json()
    assert len(body["images"]) == 2

    img_id = body["images"][0]["id"]
    deleted = await client.delete(
        f"/api/products/{product.id}/images/{img_id}", auth=AUTH_TENANT_ONE
    )
    assert deleted.status_code == 204

    after = await client.get(f"/api/products/{product.id}", auth=AUTH_TENANT_ONE)
    assert len(after.json()["images"]) == 1
