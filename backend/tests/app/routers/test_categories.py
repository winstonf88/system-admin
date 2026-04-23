import pytest

from app.models import ProductCategory, Tenant
from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    create_category,
    create_product,
    seed_two_tenant_users,
)

pytestmark = pytest.mark.asyncio


async def test_categories_are_scoped_by_tenant(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    t2 = await Tenant.get(slug="t2")
    await create_category(tenant_id=t1.id, name="Tenant 1 Root")
    await create_category(tenant_id=t2.id, name="Tenant 2 Root")

    response = await client.get("/api/categories/", auth=AUTH_TENANT_ONE)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "Tenant 1 Root"


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


async def test_create_categories_assign_incrementing_sort_order(client) -> None:
    await seed_two_tenant_users()
    first = await client.post(
        "/api/categories/",
        json={"name": "First", "parent_id": None},
        auth=AUTH_TENANT_ONE,
    )
    second = await client.post(
        "/api/categories/",
        json={"name": "Second", "parent_id": None},
        auth=AUTH_TENANT_ONE,
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["sort_order"] == 0
    assert second.json()["sort_order"] == 1


async def test_put_reorder_root_siblings(client) -> None:
    await seed_two_tenant_users()
    a = (
        await client.post(
            "/api/categories/",
            json={"name": "A", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()
    b = (
        await client.post(
            "/api/categories/",
            json={"name": "B", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()
    c = (
        await client.post(
            "/api/categories/",
            json={"name": "C", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()

    order_resp = await client.put(
        "/api/categories/order",
        json={"parent_id": None, "ordered_ids": [c["id"], a["id"], b["id"]]},
        auth=AUTH_TENANT_ONE,
    )
    assert order_resp.status_code == 200
    ordered = order_resp.json()
    assert [row["name"] for row in ordered] == ["C", "A", "B"]
    assert [row["sort_order"] for row in ordered] == [0, 1, 2]


async def test_put_reorder_rejects_incomplete_sibling_list(client) -> None:
    await seed_two_tenant_users()
    a = (
        await client.post(
            "/api/categories/",
            json={"name": "A", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()
    await client.post(
        "/api/categories/",
        json={"name": "B", "parent_id": None},
        auth=AUTH_TENANT_ONE,
    )

    bad = await client.put(
        "/api/categories/order",
        json={"parent_id": None, "ordered_ids": [a["id"]]},
        auth=AUTH_TENANT_ONE,
    )
    assert bad.status_code == 400
    assert "irmãs" in bad.json()["detail"]


async def test_move_category_renormalizes_old_parent_siblings(client) -> None:
    await seed_two_tenant_users()
    cat_a = (
        await client.post(
            "/api/categories/",
            json={"name": "A", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()
    cat_b = (
        await client.post(
            "/api/categories/",
            json={"name": "B", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()
    parent = (
        await client.post(
            "/api/categories/",
            json={"name": "P", "parent_id": None},
            auth=AUTH_TENANT_ONE,
        )
    ).json()

    moved = await client.put(
        f"/api/categories/{cat_b['id']}",
        json={"parent_id": parent["id"]},
        auth=AUTH_TENANT_ONE,
    )
    assert moved.status_code == 200

    flat = (await client.get("/api/categories/", auth=AUTH_TENANT_ONE)).json()
    roots = sorted(
        [row for row in flat if row["parent_id"] is None], key=lambda r: r["sort_order"]
    )
    assert [row["name"] for row in roots] == ["A", "P"]
    assert [row["sort_order"] for row in roots] == [0, 1]

    children = sorted(
        [row for row in flat if row["parent_id"] == parent["id"]],
        key=lambda r: r["sort_order"],
    )
    assert [row["name"] for row in children] == ["B"]


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


async def test_category_tree_includes_sort_order(client) -> None:
    await seed_two_tenant_users()
    await client.post(
        "/api/categories/",
        json={"name": "Root", "parent_id": None},
        auth=AUTH_TENANT_ONE,
    )
    tree = (await client.get("/api/categories/tree", auth=AUTH_TENANT_ONE)).json()
    assert len(tree) == 1
    assert tree[0]["name"] == "Root"
    assert "sort_order" in tree[0]
