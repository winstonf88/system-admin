import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_update_user(client) -> None:
    await seed_two_tenant_users()
    users = (await client.get("/api/users/", auth=AUTH_TENANT_ONE)).json()
    u1 = next(u for u in users if u["email"] == "u1@test.com")
    response = await client.put(
        f"/api/users/{u1['id']}",
        auth=AUTH_TENANT_ONE,
        json={"first_name": "Updated"},
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "Updated"
