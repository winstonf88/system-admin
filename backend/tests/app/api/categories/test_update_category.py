import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


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
