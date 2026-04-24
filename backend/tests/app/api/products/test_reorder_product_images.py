import pytest

from app.models import ProductCategory, ProductImage, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_reorder_product_images_updates_primary_url_and_order(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="Acessórios")
    product = await create_product(tenant_id=t1.id, name="Boné")
    await ProductCategory.create(product_id=product.id, tenant_id=t1.id, category_id=category.id)
    image_a = await ProductImage.create(
        tenant_id=t1.id, product_id=product.id, url="/uploads/products/a.png", sort_order=0
    )
    image_b = await ProductImage.create(
        tenant_id=t1.id, product_id=product.id, url="/uploads/products/b.png", sort_order=1
    )
    await product.save(update_fields=["image_url"])

    reordered = await client.put(
        f"/api/products/{product.id}/images/order",
        auth=AUTH_TENANT_ONE,
        json={"image_ids": [image_b.id, image_a.id]},
    )
    assert reordered.status_code == 200
    body = reordered.json()
    assert [img["id"] for img in body["images"]] == [image_b.id, image_a.id]
    assert body["image_url"] == "/uploads/products/b.png"

    invalid = await client.put(
        f"/api/products/{product.id}/images/order",
        auth=AUTH_TENANT_ONE,
        json={"image_ids": [image_a.id]},
    )
    assert invalid.status_code == 400
    assert "nova ordem" in invalid.json()["detail"].lower()
