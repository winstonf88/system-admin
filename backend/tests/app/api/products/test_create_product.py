import pytest

from app.models import Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


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
