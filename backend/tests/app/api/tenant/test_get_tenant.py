import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_get_tenant_requires_auth(client) -> None:
    response = await client.get("/api/tenant/")
    assert response.status_code == 401


async def test_get_tenant_ok(client) -> None:
    await seed_two_tenant_users()
    response = await client.get("/api/tenant/", auth=AUTH_TENANT_ONE)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Tenant One"
    assert data["slug"] == "t1"
    assert data["config"] == {}
