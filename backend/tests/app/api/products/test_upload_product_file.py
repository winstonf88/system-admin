import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_upload_url_stays_tenant_agnostic_and_enforced(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    t2 = await Tenant.get(slug="t2")
    category_1 = await create_category(tenant_id=t1.id, name="T1 Cat")
    category_2 = await create_category(tenant_id=t2.id, name="T2 Cat")
    product_1 = await create_product(tenant_id=t1.id, name="Tenant 1 Product")
    product_2 = await create_product(tenant_id=t2.id, name="Tenant 2 Product")
    await ProductCategory.create(product_id=product_1.id, tenant_id=t1.id, category_id=category_1.id)
    await ProductCategory.create(product_id=product_2.id, tenant_id=t2.id, category_id=category_2.id)

    own_upload = await client.post(
        f"/api/products/{product_1.id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("image.png", b"fake-bytes", "image/png")},
    )
    assert own_upload.status_code == 200
    own_url = own_upload.json()["file_url"]
    assert own_url.startswith("/uploads/products/")
    assert "/uploads/1/" not in own_url

    cross_tenant_upload = await client.post(
        f"/api/products/{product_2.id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("image.png", b"fake-bytes", "image/png")},
    )
    assert cross_tenant_upload.status_code == 404


async def test_upload_rejects_more_than_ten_images_per_product(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="Acessórios")
    product = await create_product(tenant_id=t1.id, name="Boné")
    await ProductCategory.create(product_id=product.id, tenant_id=t1.id, category_id=category.id)

    for idx in range(10):
        uploaded = await client.post(
            f"/api/products/{product.id}/upload",
            auth=AUTH_TENANT_ONE,
            files={"file": (f"image-{idx}.png", b"fake-bytes", "image/png")},
        )
        assert uploaded.status_code == 200

    rejected = await client.post(
        f"/api/products/{product.id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("image-11.png", b"fake-bytes", "image/png")},
    )
    assert rejected.status_code == 400
    assert "No máximo 10 imagens" in rejected.json()["detail"]
