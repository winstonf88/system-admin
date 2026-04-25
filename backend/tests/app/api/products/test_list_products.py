import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_list_products_supports_name_category_and_is_active_filters(
    client,
) -> None:
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
    bone.is_active = False
    await bone.save(update_fields=["is_active"])

    await ProductCategory.create(
        product_id=camisa.id, tenant_id=t1.id, category_id=roupas.id
    )
    await ProductCategory.create(
        product_id=tenis.id, tenant_id=t1.id, category_id=calcados.id
    )
    await ProductCategory.create(
        product_id=bone.id, tenant_id=t1.id, category_id=roupas.id
    )
    await ProductCategory.create(
        product_id=tenant2_product.id, tenant_id=t2.id, category_id=tenant2_cat.id
    )

    by_name = await client.get("/api/products/?name=camisa", auth=AUTH_TENANT_ONE)
    assert by_name.status_code == 200
    by_name_names = [p["name"] for p in by_name.json()["items"]]
    assert by_name_names == ["Camisa Polo"]

    by_category = await client.get(
        f"/api/products/?category_id={roupas.id}", auth=AUTH_TENANT_ONE
    )
    assert by_category.status_code == 200
    by_category_names = [p["name"] for p in by_category.json()["items"]]
    assert by_category_names == ["Boné Aba Reta", "Camisa Polo"]

    combined = await client.get(
        f"/api/products/?name=bo&category_id={roupas.id}", auth=AUTH_TENANT_ONE
    )
    assert combined.status_code == 200
    combined_names = [p["name"] for p in combined.json()["items"]]
    assert combined_names == ["Boné Aba Reta"]

    active_only = await client.get(
        "/api/products/?is_active=true", auth=AUTH_TENANT_ONE
    )
    assert active_only.status_code == 200
    active_only_names = [p["name"] for p in active_only.json()["items"]]
    assert active_only_names == ["Camisa Polo", "Tênis Corrida"]

    inactive_only = await client.get(
        "/api/products/?is_active=false", auth=AUTH_TENANT_ONE
    )
    assert inactive_only.status_code == 200
    inactive_only_names = [p["name"] for p in inactive_only.json()["items"]]
    assert inactive_only_names == ["Boné Aba Reta"]


async def test_list_products_pagination(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")

    for i in range(1, 6):
        await create_product(tenant_id=t1.id, name=f"Product {i:02d}")

    page1 = await client.get("/api/products/?page=1&count=2", auth=AUTH_TENANT_ONE)
    assert page1.status_code == 200
    data1 = page1.json()
    assert data1["total"] == 5
    assert data1["page"] == 1
    assert data1["count"] == 2
    assert [p["name"] for p in data1["items"]] == ["Product 01", "Product 02"]

    page2 = await client.get("/api/products/?page=2&count=2", auth=AUTH_TENANT_ONE)
    assert page2.status_code == 200
    data2 = page2.json()
    assert data2["total"] == 5
    assert data2["page"] == 2
    assert [p["name"] for p in data2["items"]] == ["Product 03", "Product 04"]

    page3 = await client.get("/api/products/?page=3&count=2", auth=AUTH_TENANT_ONE)
    assert page3.status_code == 200
    data3 = page3.json()
    assert data3["total"] == 5
    assert [p["name"] for p in data3["items"]] == ["Product 05"]


async def test_list_products_pagination_beyond_last_page_returns_empty(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")

    await create_product(tenant_id=t1.id, name="Only Product")

    resp = await client.get("/api/products/?page=99&count=10", auth=AUTH_TENANT_ONE)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"] == []


async def test_list_products_pagination_invalid_params(client) -> None:
    await seed_two_tenant_users()

    resp_zero_page = await client.get("/api/products/?page=0", auth=AUTH_TENANT_ONE)
    assert resp_zero_page.status_code == 422

    resp_zero_count = await client.get("/api/products/?count=0", auth=AUTH_TENANT_ONE)
    assert resp_zero_count.status_code == 422

    resp_over_limit = await client.get("/api/products/?count=101", auth=AUTH_TENANT_ONE)
    assert resp_over_limit.status_code == 422


async def test_list_products_default_pagination_response_shape(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")

    await create_product(tenant_id=t1.id, name="Alpha")
    await create_product(tenant_id=t1.id, name="Beta")

    resp = await client.get("/api/products/", auth=AUTH_TENANT_ONE)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["page"] == 1
    assert data["count"] == 20
    assert len(data["items"]) == 2
