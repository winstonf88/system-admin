import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


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
