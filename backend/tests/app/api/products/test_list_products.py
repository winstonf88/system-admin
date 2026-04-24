import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_list_products_supports_name_category_and_is_active_filters(client) -> None:
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

    active_only = await client.get("/api/products/?is_active=true", auth=AUTH_TENANT_ONE)
    assert active_only.status_code == 200
    active_only_names = [p["name"] for p in active_only.json()]
    assert active_only_names == ["Camisa Polo", "Tênis Corrida"]

    inactive_only = await client.get("/api/products/?is_active=false", auth=AUTH_TENANT_ONE)
    assert inactive_only.status_code == 200
    inactive_only_names = [p["name"] for p in inactive_only.json()]
    assert inactive_only_names == ["Boné Aba Reta"]
