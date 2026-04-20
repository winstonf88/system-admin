import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import ProductCategory

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
            image_url=None,
        )
        session.add(tenant2_product)
        await session.flush()
        session.add(
            ProductCategory(
                product_id=tenant2_product.id,
                tenant_id=2,
                category_id=tenant2_category.id,
            )
        )
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
            image_url=None,
        )
        product_2 = ProductFactory.build(
            tenant_id=2,
            name="Tenant 2 Product",
            description=None,
            image_url=None,
        )
        session.add_all([product_1, product_2])
        await session.flush()
        session.add_all(
            [
                ProductCategory(
                    product_id=product_1.id,
                    tenant_id=1,
                    category_id=category_1.id,
                ),
                ProductCategory(
                    product_id=product_2.id,
                    tenant_id=2,
                    category_id=category_2.id,
                ),
            ]
        )
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

    second = await client.post(
        f"/api/products/{product_1.id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("second.jpg", b"more-bytes", "image/jpeg")},
    )
    assert second.status_code == 200
    detail = await client.get(f"/api/products/{product_1.id}", auth=AUTH_TENANT_ONE)
    assert detail.status_code == 200
    body = detail.json()
    assert len(body["images"]) == 2
    assert body["images"][0]["url"] != body["images"][1]["url"]

    img_id = body["images"][0]["id"]
    deleted = await client.delete(f"/api/products/{product_1.id}/images/{img_id}", auth=AUTH_TENANT_ONE)
    assert deleted.status_code == 204
    after = await client.get(f"/api/products/{product_1.id}", auth=AUTH_TENANT_ONE)
    assert len(after.json()["images"]) == 1


async def test_create_product_returns_selected_categories_in_payload_ordered(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        cat_a = CategoryFactory.build(tenant_id=1, name="A", parent_id=None)
        cat_b = CategoryFactory.build(tenant_id=1, name="B", parent_id=None)
        session.add_all([cat_a, cat_b])
        await session.commit()

    created = await client.post(
        "/api/products/",
        auth=AUTH_TENANT_ONE,
        json={
            "name": "Camisa",
            "description": "Produto com duas categorias",
            "category_ids": [cat_b.id, cat_a.id],
            "image_url": None,
            "variations": [{"size": "M", "color": "Preto", "quantity": 7}],
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Camisa"
    # API normalizes to sorted category ids to keep payload deterministic.
    assert body["category_ids"] == sorted([cat_b.id, cat_a.id])
    assert body["variations"][0]["quantity"] == 7


async def test_upload_rejects_more_than_ten_images_per_product(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        category = CategoryFactory.build(tenant_id=1, name="Acessórios", parent_id=None)
        product = ProductFactory.build(
            tenant_id=1,
            name="Boné",
            description=None,
            image_url=None,
        )
        session.add_all([category, product])
        await session.flush()
        session.add(
            ProductCategory(
                product_id=product.id,
                tenant_id=1,
                category_id=category.id,
            )
        )
        await session.commit()

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
    assert "No m\u00e1ximo 10 imagens" in rejected.json()["detail"]
