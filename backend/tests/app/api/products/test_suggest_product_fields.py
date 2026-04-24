import pytest

import app.api.products.suggest_product_fields as suggest_product_fields_router
from app.models import ProductCategory, ProductImage, Tenant
from app.schemas import ProductAISuggestionOutput
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


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
    ) -> ProductAISuggestionOutput:
        return ProductAISuggestionOutput(
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
    ) -> ProductAISuggestionOutput:
        return ProductAISuggestionOutput(
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
    ) -> ProductAISuggestionOutput:
        assert len(images) == 1
        return ProductAISuggestionOutput(name=["Nome por ID"])

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
    ) -> ProductAISuggestionOutput:
        return ProductAISuggestionOutput(
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
