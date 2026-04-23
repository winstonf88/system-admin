import pytest

import app.routers.products.suggest_product_fields as suggest_product_fields_router
from app.models import ProductCategory, ProductImage, Tenant
from app.routers import products as products_router

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


async def test_create_product_returns_selected_categories_in_payload_ordered(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    cat_a = await create_category(tenant_id=t1.id, name="A")
    cat_b = await create_category(tenant_id=t1.id, name="B")

    created = await client.post(
        "/api/products/",
        auth=AUTH_TENANT_ONE,
        json={
            "name": "Camisa",
            "price": 129.9,
            "description": "Produto com duas categorias",
            "category_ids": [cat_b.id, cat_a.id],
            "image_url": None,
            "variations": [{"size": "M", "color": "Preto", "quantity": 7}],
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Camisa"
    assert body["price"] == 129.9
    assert body["category_ids"] == sorted([cat_b.id, cat_a.id])
    assert body["variations"][0]["quantity"] == 7


@pytest.mark.parametrize("missing_field", ["name", "category_ids", "price"])
async def test_create_product_requires_name_category_and_price(
    client, missing_field: str
) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="Roupas")

    payload = {
        "name": "Camisa",
        "price": 129.9,
        "description": "Produto",
        "category_ids": [category.id],
        "image_url": None,
        "variations": [{"size": "M", "color": "Preto", "quantity": 7}],
    }
    payload.pop(missing_field)

    created = await client.post("/api/products/", auth=AUTH_TENANT_ONE, json=payload)
    assert created.status_code == 422
    body = created.json()
    assert any(
        error.get("loc") == ["body", missing_field] for error in body.get("detail", [])
    )


@pytest.mark.parametrize("invalid_price", [0, -1, -0.01])
async def test_create_product_rejects_zero_or_negative_price(
    client, invalid_price: float
) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="Roupas")

    created = await client.post(
        "/api/products/",
        auth=AUTH_TENANT_ONE,
        json={
            "name": "Camisa",
            "price": invalid_price,
            "description": "Produto com preço inválido",
            "category_ids": [category.id],
            "image_url": None,
            "variations": [{"size": "M", "color": "Preto", "quantity": 7}],
        },
    )
    assert created.status_code == 422
    body = created.json()
    assert any(error.get("loc") == ["body", "price"] for error in body.get("detail", []))


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


async def test_list_products_supports_name_and_category_filters(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    t2 = await Tenant.get(slug="t2")
    roupas = await create_category(tenant_id=t1.id, name="Roupas")
    calcados = await create_category(tenant_id=t1.id, name="Calçados")
    tenant2_cat = await create_category(tenant_id=t2.id, name="Roupas")

    camisa = await create_product(tenant_id=t1.id, name="Camisa Polo")
    tenis = await create_product(tenant_id=t1.id, name="Tênis Corrida")
    bone = await create_product(tenant_id=t1.id, name="Boné Aba Reta")
    tenant2_product = await create_product(tenant_id=t2.id, name="Camisa Tenant 2")

    await ProductCategory.create(product_id=camisa.id, tenant_id=t1.id, category_id=roupas.id)
    await ProductCategory.create(product_id=tenis.id, tenant_id=t1.id, category_id=calcados.id)
    await ProductCategory.create(product_id=bone.id, tenant_id=t1.id, category_id=roupas.id)
    await ProductCategory.create(product_id=tenant2_product.id, tenant_id=t2.id, category_id=tenant2_cat.id)

    by_name = await client.get("/api/products/?name=camisa", auth=AUTH_TENANT_ONE)
    assert by_name.status_code == 200
    by_name_names = [p["name"] for p in by_name.json()]
    assert by_name_names == ["Camisa Polo"]

    by_category = await client.get(
        f"/api/products/?category_id={roupas.id}", auth=AUTH_TENANT_ONE
    )
    assert by_category.status_code == 200
    by_category_names = [p["name"] for p in by_category.json()]
    assert by_category_names == ["Boné Aba Reta", "Camisa Polo"]

    combined = await client.get(
        f"/api/products/?name=bo&category_id={roupas.id}", auth=AUTH_TENANT_ONE
    )
    assert combined.status_code == 200
    combined_names = [p["name"] for p in combined.json()]
    assert combined_names == ["Boné Aba Reta"]


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
    assert "No m\u00e1ximo 10 imagens" in rejected.json()["detail"]


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


async def test_ai_suggestions_returns_only_requested_fields_and_tenant_categories(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    t2 = await Tenant.get(slug="t2")
    tenant1_cat_a = await create_category(tenant_id=t1.id, name="Roupas")
    tenant1_cat_b = await create_category(tenant_id=t1.id, name="Calçados")
    tenant2_cat = await create_category(tenant_id=t2.id, name="Eletrônicos")

    async def fake_run_ai_suggestions(
        *, requested_fields, images, tenant_categories
    ) -> products_router.ProductAISuggestionOutput:
        return products_router.ProductAISuggestionOutput(
            name=["Nome 1", "Nome 1", "Nome 2"],
            description=["Descrição que não deve retornar"],
            category=[tenant1_cat_b.id, tenant2_cat.id, tenant1_cat_a.id, tenant1_cat_b.id],
        )

    monkeypatch.setattr(suggest_product_fields_router, "run_ai_suggestions", fake_run_ai_suggestions)

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


async def test_ai_suggestions_enforces_field_whitelist(client) -> None:
    await seed_two_tenant_users()
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
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    await seed_two_tenant_users()

    async def fake_run_ai_suggestions(
        *, requested_fields, images, tenant_categories
    ) -> products_router.ProductAISuggestionOutput:
        return products_router.ProductAISuggestionOutput(
            name=[f"Nome {idx}" for idx in range(1, 15)],
            description=[f"Descrição {idx}" for idx in range(1, 8)],
            category=[999],
        )

    monkeypatch.setattr(suggest_product_fields_router, "run_ai_suggestions", fake_run_ai_suggestions)

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
    assert len(body["description"]) == 6
    assert "category" not in body


async def test_ai_suggestions_rejects_empty_or_missing_files(client) -> None:
    await seed_two_tenant_users()
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
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="Roupas")
    product = await create_product(tenant_id=t1.id, name="Camisa")
    await ProductCategory.create(product_id=product.id, tenant_id=t1.id, category_id=category.id)

    uploaded = await client.post(
        f"/api/products/{product.id}/upload",
        auth=AUTH_TENANT_ONE,
        files={"file": ("product.png", b"fake-image", "image/png")},
    )
    assert uploaded.status_code == 200

    detail = await client.get(f"/api/products/{product.id}", auth=AUTH_TENANT_ONE)
    assert detail.status_code == 200
    product_image_id = detail.json()["images"][0]["id"]

    async def fake_run_ai_suggestions(
        *, requested_fields, images, tenant_categories
    ) -> products_router.ProductAISuggestionOutput:
        assert len(images) == 1
        return products_router.ProductAISuggestionOutput(name=["Nome por ID"])

    monkeypatch.setattr(suggest_product_fields_router, "run_ai_suggestions", fake_run_ai_suggestions)

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


async def test_ai_suggestions_blocks_cross_tenant_product_image_ids(client) -> None:
    await seed_two_tenant_users()
    t2 = await Tenant.get(slug="t2")
    tenant2_category = await create_category(tenant_id=t2.id, name="Roupas T2")
    tenant2_product = await create_product(tenant_id=t2.id, name="Produto T2")
    await ProductCategory.create(
        product_id=tenant2_product.id, tenant_id=t2.id, category_id=tenant2_category.id
    )
    tenant2_image = await ProductImage.create(
        tenant_id=t2.id,
        product_id=tenant2_product.id,
        url="/uploads/products/tenant2.png",
        sort_order=0,
    )

    response = await client.post(
        "/api/products/ai-suggestions",
        auth=AUTH_TENANT_ONE,
        files=[
            ("fields", (None, "name")),
            ("product_image_ids", (None, str(tenant2_image.id))),
        ],
    )

    assert response.status_code == 404
    assert "imagem não encontrada" in response.json()["detail"].lower()


async def test_ai_suggestions_without_fields_suggests_all(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    t2 = await Tenant.get(slug="t2")
    tenant1_cat_a = await create_category(tenant_id=t1.id, name="Roupas")
    tenant1_cat_b = await create_category(tenant_id=t1.id, name="Calçados")
    tenant2_cat = await create_category(tenant_id=t2.id, name="Eletrônicos")

    async def fake_run_ai_suggestions(
        *, requested_fields, images, tenant_categories
    ) -> products_router.ProductAISuggestionOutput:
        return products_router.ProductAISuggestionOutput(
            name=["Nome 1", "Nome 2"],
            description=["Descrição 1"],
            category=[tenant1_cat_a.id, tenant2_cat.id, tenant1_cat_b.id],
        )

    monkeypatch.setattr(suggest_product_fields_router, "run_ai_suggestions", fake_run_ai_suggestions)

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
