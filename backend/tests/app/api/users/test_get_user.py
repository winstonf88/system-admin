import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, AUTH_TENANT_TWO, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_get_user_blocks_cross_tenant(client) -> None:
    await seed_two_tenant_users()
    users_t2 = (await client.get("/api/users/", auth=AUTH_TENANT_TWO)).json()
    u2 = next(u for u in users_t2 if u["email"] == "u2@test.com")
    response = await client.get(f"/api/users/{u2['id']}", auth=AUTH_TENANT_ONE)
    assert response.status_code == 404
