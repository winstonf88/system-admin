import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

import app.routers.products.suggest_product_fields as suggest_product_fields_router
from app.models import ProductCategory, ProductImage
from app.routers import products as products_router

from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    CategoryFactory,
    ProductFactory,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_product_lookup_blocks_cross_tenant_access(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        tenant1_category = CategoryFactory.build(
            tenant_id=1, name="T1 Cat", parent_id=None
        )
        tenant2_category = CategoryFactory.build(
            tenant_id=2, name="T2 Cat", parent_id=None
        )
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
    deleted = await client.delete(
        f"/api/products/{product_1.id}/images/{img_id}", auth=AUTH_TENANT_ONE
    )
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


async def test_list_products_supports_name_and_category_filters(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        roupas = CategoryFactory.build(tenant_id=1, name="Roupas", parent_id=None)
        calcados = CategoryFactory.build(tenant_id=1, name="Calçados", parent_id=None)
        tenant2_cat = CategoryFactory.build(tenant_id=2, name="Roupas", parent_id=None)
        session.add_all([roupas, calcados, tenant2_cat])
        await session.flush()

        camisa = ProductFactory.build(
            tenant_id=1,
            name="Camisa Polo",
            description=None,
            image_url=None,
        )
        tenis = ProductFactory.build(
            tenant_id=1,
            name="Tênis Corrida",
            description=None,
            image_url=None,
        )
        bone = ProductFactory.build(
            tenant_id=1,
            name="Boné Aba Reta",
            description=None,
            image_url=None,
        )
        tenant2_product = ProductFactory.build(
            tenant_id=2,
            name="Camisa Tenant 2",
            description=None,
            image_url=None,
        )
        session.add_all([camisa, tenis, bone, tenant2_product])
        await session.flush()

        session.add_all(
            [
                ProductCategory(
                    product_id=camisa.id,
                    tenant_id=1,
                    category_id=roupas.id,
                ),
                ProductCategory(
                    product_id=tenis.id,
                    tenant_id=1,
                    category_id=calcados.id,
                ),
                ProductCategory(
                    product_id=bone.id,
                    tenant_id=1,
                    category_id=roupas.id,
                ),
                ProductCategory(
                    product_id=tenant2_product.id,
                    tenant_id=2,
                    category_id=tenant2_cat.id,
                ),
            ]
        )
        await session.commit()

    by_name = await client.get("/api/products/?name=camisa", auth=AUTH_TENANT_ONE)
    assert by_name.status_code == 200
    by_name_names = [p["name"] for p in by_name.json()]
    assert by_name_names == ["Camisa Polo"]

    by_category = await client.get(
        f"/api/products/?category_id={roupas.id}",
        auth=AUTH_TENANT_ONE,
    )
    assert by_category.status_code == 200
    by_category_names = [p["name"] for p in by_category.json()]
    assert by_category_names == ["Boné Aba Reta", "Camisa Polo"]

    combined = await client.get(
        f"/api/products/?name=bo&category_id={roupas.id}",
        auth=AUTH_TENANT_ONE,
    )
    assert combined.status_code == 200
    combined_names = [p["name"] for p in combined.json()]
    assert combined_names == ["Boné Aba Reta"]


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


async def test_reorder_product_images_updates_primary_url_and_order(
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
        image_a = ProductImage(
            tenant_id=1,
            product_id=product.id,
            url="/uploads/products/a.png",
            sort_order=0,
        )
        image_b = ProductImage(
            tenant_id=1,
            product_id=product.id,
            url="/uploads/products/b.png",
            sort_order=1,
        )
        session.add_all([image_a, image_b])
        await session.commit()
        product_id = product.id
        first_id = image_a.id
        second_id = image_b.id

    reordered = await client.put(
        f"/api/products/{product_id}/images/order",
        auth=AUTH_TENANT_ONE,
        json={"image_ids": [second_id, first_id]},
    )
    assert reordered.status_code == 200
    body = reordered.json()
    assert [img["id"] for img in body["images"]] == [second_id, first_id]
    assert body["image_url"] == "/uploads/products/b.png"

    invalid = await client.put(
        f"/api/products/{product_id}/images/order",
        auth=AUTH_TENANT_ONE,
        json={"image_ids": [first_id]},
    )
    assert invalid.status_code == 400
    assert "nova ordem" in invalid.json()["detail"].lower()


async def test_ai_suggestions_returns_only_requested_fields_and_tenant_categories(
    client,
    session_maker: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        tenant1_cat_a = CategoryFactory.build(
            tenant_id=1, name="Roupas", parent_id=None
        )
        tenant1_cat_b = CategoryFactory.build(
            tenant_id=1, name="Calçados", parent_id=None
        )
        tenant2_cat = CategoryFactory.build(
            tenant_id=2, name="Eletrônicos", parent_id=None
        )
        session.add_all([tenant1_cat_a, tenant1_cat_b, tenant2_cat])
        await session.commit()

    async def fake_run_ai_suggestions(
        *,
        requested_fields,
        images,
        tenant_categories,
    ) -> products_router.ProductAISuggestionOutput:
        return products_router.ProductAISuggestionOutput(
            name=["Nome 1", "Nome 1", "Nome 2"],
            description=["Descrição que não deve retornar"],
            category=[
                tenant1_cat_b.id,
                tenant2_cat.id,
                tenant1_cat_a.id,
                tenant1_cat_b.id,
            ],
        )

    monkeypatch.setattr(
        suggest_product_fields_router,
        "run_ai_suggestions",
        fake_run_ai_suggestions,
    )

    response = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[
            ("fields", (None, "name")),
            ("fields", (None, "category")),
            ("files", ("product.png", b"fake-image", "image/png")),
        ],
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"name", "category"}
    assert body["name"] == ["Nome 1", "Nome 2"]
    assert body["category"] == [tenant1_cat_b.id, tenant1_cat_a.id]


async def test_ai_suggestions_enforces_field_whitelist(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[
            ("fields", (None, "invalid-field")),
            ("files", ("product.png", b"fake-image", "image/png")),
        ],
    )

    assert response.status_code == 422


async def test_ai_suggestions_applies_limits(
    client,
    session_maker: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await seed_two_tenant_users(session_maker)

    async def fake_run_ai_suggestions(
        *,
        requested_fields,
        images,
        tenant_categories,
    ) -> products_router.ProductAISuggestionOutput:
        return products_router.ProductAISuggestionOutput(
            name=[f"Nome {idx}" for idx in range(1, 15)],
            description=[f"Descrição {idx}" for idx in range(1, 8)],
            category=[999],
        )

    monkeypatch.setattr(
        suggest_product_fields_router,
        "run_ai_suggestions",
        fake_run_ai_suggestions,
    )

    response = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[
            ("fields", (None, "name")),
            ("fields", (None, "description")),
            ("files", ("product.png", b"fake-image", "image/png")),
        ],
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["name"]) == 10
    assert len(body["description"]) == 3
    assert "category" not in body


async def test_ai_suggestions_rejects_empty_or_missing_files(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    empty_file = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[
            ("fields", (None, "name")),
            ("files", ("product.png", b"", "image/png")),
        ],
    )
    assert empty_file.status_code == 400
    assert "Arquivo vazio" in empty_file.json()["detail"]

    missing_file = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[("fields", (None, "name"))],
    )
    assert missing_file.status_code == 400
    assert "ao menos uma imagem" in missing_file.json()["detail"].lower()


async def test_ai_suggestions_accepts_existing_product_image_ids(
    client,
    session_maker: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        category = CategoryFactory.build(tenant_id=1, name="Roupas", parent_id=None)
        product = ProductFactory.build(
            tenant_id=1,
            name="Camisa",
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
        product_id = product.id

    uploaded = await client.post(
        f"/api/products/{product_id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("product.png", b"fake-image", "image/png")},
    )
    assert uploaded.status_code == 200

    detail = await client.get(f"/api/products/{product_id}", auth=AUTH_TENANT_ONE)
    assert detail.status_code == 200
    product_image_id = detail.json()["images"][0]["id"]

    async def fake_run_ai_suggestions(
        *,
        requested_fields,
        images,
        tenant_categories,
    ) -> products_router.ProductAISuggestionOutput:
        assert len(images) == 1
        return products_router.ProductAISuggestionOutput(name=["Nome por ID"])

    monkeypatch.setattr(
        suggest_product_fields_router,
        "run_ai_suggestions",
        fake_run_ai_suggestions,
    )

    response = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[
            ("fields", (None, "name")),
            ("product_image_ids", (None, str(product_image_id))),
        ],
    )

    assert response.status_code == 200
    assert response.json()["name"] == ["Nome por ID"]


async def test_ai_suggestions_blocks_cross_tenant_product_image_ids(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        tenant1_category = CategoryFactory.build(
            tenant_id=1, name="Roupas T1", parent_id=None
        )
        tenant2_category = CategoryFactory.build(
            tenant_id=2, name="Roupas T2", parent_id=None
        )
        tenant2_product = ProductFactory.build(
            tenant_id=2,
            name="Produto T2",
            description=None,
            image_url=None,
        )
        session.add_all([tenant1_category, tenant2_category, tenant2_product])
        await session.flush()
        session.add(
            ProductCategory(
                product_id=tenant2_product.id,
                tenant_id=2,
                category_id=tenant2_category.id,
            )
        )
        tenant2_image = ProductImage(
            tenant_id=2,
            product_id=tenant2_product.id,
            url="/uploads/products/tenant2.png",
            sort_order=0,
        )
        session.add(tenant2_image)
        await session.commit()
        tenant2_image_id = tenant2_image.id

    response = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[
            ("fields", (None, "name")),
            ("product_image_ids", (None, str(tenant2_image_id))),
        ],
    )

    assert response.status_code == 404
    assert "imagem não encontrada" in response.json()["detail"].lower()


async def test_ai_suggestions_without_fields_suggests_all(
    client,
    session_maker: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        tenant1_cat_a = CategoryFactory.build(
            tenant_id=1, name="Roupas", parent_id=None
        )
        tenant1_cat_b = CategoryFactory.build(
            tenant_id=1, name="Calçados", parent_id=None
        )
        tenant2_cat = CategoryFactory.build(
            tenant_id=2, name="Eletrônicos", parent_id=None
        )
        session.add_all([tenant1_cat_a, tenant1_cat_b, tenant2_cat])
        await session.commit()

    async def fake_run_ai_suggestions(
        *,
        requested_fields,
        images,
        tenant_categories,
    ) -> products_router.ProductAISuggestionOutput:
        return products_router.ProductAISuggestionOutput(
            name=["Nome 1", "Nome 2"],
            description=["Descrição 1"],
            category=[tenant1_cat_a.id, tenant2_cat.id, tenant1_cat_b.id],
        )

    monkeypatch.setattr(
        suggest_product_fields_router,
        "run_ai_suggestions",
        fake_run_ai_suggestions,
    )

    response = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[("files", ("product.png", b"fake-image", "image/png"))],
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"name", "description", "category"}
    assert body["name"] == ["Nome 1", "Nome 2"]
    assert body["description"] == ["Descrição 1"]
    assert body["category"] == [tenant1_cat_a.id, tenant1_cat_b.id]
