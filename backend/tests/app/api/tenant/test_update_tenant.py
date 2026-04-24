import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_patch_tenant_name_and_config(client) -> None:
    await seed_two_tenant_users()
    response = await client.patch(
        "/api/tenant/",
        auth=AUTH_TENANT_ONE,
        json={"name": "Renamed Org", "config": {"theme": "dark", "n": 1}},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Renamed Org"
    assert data["config"] == {"theme": "dark", "n": 1}

    again = await client.get("/api/tenant/", auth=AUTH_TENANT_ONE)
    assert again.json()["name"] == "Renamed Org"
