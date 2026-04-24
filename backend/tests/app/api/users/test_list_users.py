import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_list_users_scoped_to_tenant(client) -> None:
    await seed_two_tenant_users()

    response = await client.get("/api/users/", auth=AUTH_TENANT_ONE)
    assert response.status_code == 200
    payload = response.json()
    emails = {row["email"] for row in payload}
    assert emails == {"inactive@test.com", "u1@test.com"}
    for row in payload:
        assert "password_hash" not in row


async def test_list_users_requires_auth(client) -> None:
    response = await client.get("/api/users/")
    assert response.status_code == 401
