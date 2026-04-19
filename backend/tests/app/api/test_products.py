import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.app.models.factories import AUTH_TENANT_ONE, CategoryFactory, ProductFactory, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_product_lookup_blocks_cross_tenant_access(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        tenant1_category = CategoryFactory.build(tenant_id=1, name="T1 Cat", parent_id=None)
        tenant2_category = CategoryFactory.build(tenant_id=2, name="T2 Cat", parent_id=None)
        session.add_all([tenant1_category, tenant2_category])
        await session.flush()
        tenant2_product = ProductFactory.build(
            tenant_id=2,
            name="Tenant 2 Product",
            description=None,
            category_id=tenant2_category.id,
            image_url=None,
        )
        session.add(tenant2_product)
        await session.flush()
        product_id = tenant2_product.id
        await session.commit()

    response = await client.get(f"/api/products/{product_id}", auth=AUTH_TENANT_ONE)
    assert response.status_code == 404


async def test_upload_url_stays_tenant_agnostic_and_enforced(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        category_1 = CategoryFactory.build(tenant_id=1, name="T1 Cat", parent_id=None)
        category_2 = CategoryFactory.build(tenant_id=2, name="T2 Cat", parent_id=None)
        session.add_all([category_1, category_2])
        await session.flush()
        product_1 = ProductFactory.build(
            tenant_id=1,
            name="Tenant 1 Product",
            description=None,
            category_id=category_1.id,
            image_url=None,
        )
        product_2 = ProductFactory.build(
            tenant_id=2,
            name="Tenant 2 Product",
            description=None,
            category_id=category_2.id,
            image_url=None,
        )
        session.add_all([product_1, product_2])
        await session.commit()

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
