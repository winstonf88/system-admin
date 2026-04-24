import pytest

from app.models import Tenant
from tests.app.models.factories import AUTH_TENANT_ONE, create_category, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


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


async def test_category_tree_filter_active_only(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    await create_category(tenant_id=t1.id, name="Active", is_active=True)
    await create_category(tenant_id=t1.id, name="Inactive", is_active=False)

    tree = (
        await client.get("/api/categories/tree?is_active=true", auth=AUTH_TENANT_ONE)
    ).json()
    names = [n["name"] for n in tree]
    assert "Active" in names
    assert "Inactive" not in names


async def test_category_tree_filter_inactive_only(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    await create_category(tenant_id=t1.id, name="Active", is_active=True)
    await create_category(tenant_id=t1.id, name="Inactive", is_active=False)

    tree = (
        await client.get("/api/categories/tree?is_active=false", auth=AUTH_TENANT_ONE)
    ).json()
    names = [n["name"] for n in tree]
    assert "Inactive" in names
    assert "Active" not in names


async def test_category_tree_no_filter_returns_all(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    await create_category(tenant_id=t1.id, name="Active", is_active=True)
    await create_category(tenant_id=t1.id, name="Inactive", is_active=False)

    tree = (await client.get("/api/categories/tree", auth=AUTH_TENANT_ONE)).json()
    names = [n["name"] for n in tree]
    assert "Active" in names
    assert "Inactive" in names
