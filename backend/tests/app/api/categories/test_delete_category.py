import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_delete_category_is_blocked_when_linked_to_products(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    category = await create_category(tenant_id=t1.id, name="Com vínculo")
    product = await create_product(tenant_id=t1.id, name="Produto ligado")
    await ProductCategory.create(product_id=product.id, category_id=category.id, tenant_id=t1.id)

    response = await client.delete(
        f"/api/categories/{category.id}", auth=AUTH_TENANT_ONE
    )
    assert response.status_code == 400
    assert "Exclua ou mova os produtos" in response.json()["detail"]


async def test_delete_category_renormalizes_sibling_sort_order(client) -> None:
    await seed_two_tenant_users()
    await client.post(
        "/api/categories/", json={"name": "A", "parent_id": None}, auth=AUTH_TENANT_ONE
    )
    mid = (
        await client.post(
            "/api/categories/",
            json={"name": "B", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()
    await client.post(
        "/api/categories/", json={"name": "C", "parent_id": None}, auth=AUTH_TENANT_ONE
    )

    deleted = await client.delete(f"/api/categories/{mid['id']}", auth=AUTH_TENANT_ONE)
    assert deleted.status_code == 204

    flat = (await client.get("/api/categories/", auth=AUTH_TENANT_ONE)).json()
    roots = sorted(
        [row for row in flat if row["parent_id"] is None], key=lambda r: r["sort_order"]
    )
    assert [row["name"] for row in roots] == ["A", "C"]
    assert [row["sort_order"] for row in roots] == [0, 1]
