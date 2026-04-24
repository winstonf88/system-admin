import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


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
