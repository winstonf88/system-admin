import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_delete_user(client) -> None:
    await seed_two_tenant_users()
    users = (await client.get("/api/users/", auth=AUTH_TENANT_ONE)).json()
    inactive = next(u for u in users if u["email"] == "inactive@test.com")
    response = await client.delete(f"/api/users/{inactive['id']}", auth=AUTH_TENANT_ONE)
    assert response.status_code == 204


async def test_cannot_delete_self(client) -> None:
    await seed_two_tenant_users()
    users = (await client.get("/api/users/", auth=AUTH_TENANT_ONE)).json()
    u1 = next(u for u in users if u["email"] == "u1@test.com")
    response = await client.delete(f"/api/users/{u1['id']}", auth=AUTH_TENANT_ONE)
    assert response.status_code == 400
