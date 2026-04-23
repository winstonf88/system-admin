import pytest

from tests.app.models.factories import (
    AUTH_TENANT_ONE,
    AUTH_TENANT_TWO,
    seed_two_tenant_users,
)

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


async def test_create_user(client) -> None:
    await seed_two_tenant_users()
    response = await client.post(
        "/api/users/",
        auth=AUTH_TENANT_ONE,
        json={
            "email": "newuser@test.com",
            "password": "password12",
            "first_name": "New",
            "last_name": "Person",
            "is_active": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["first_name"] == "New"
    assert data["last_name"] == "Person"
    assert data["is_active"] is True


async def test_create_user_duplicate_email(client) -> None:
    await seed_two_tenant_users()
    response = await client.post(
        "/api/users/",
        auth=AUTH_TENANT_ONE,
        json={"email": "u1@test.com", "password": "password12"},
    )
    assert response.status_code == 409


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


async def test_get_user_blocks_cross_tenant(client) -> None:
    await seed_two_tenant_users()
    users_t2 = (await client.get("/api/users/", auth=AUTH_TENANT_TWO)).json()
    u2 = next(u for u in users_t2 if u["email"] == "u2@test.com")
    response = await client.get(f"/api/users/{u2['id']}", auth=AUTH_TENANT_ONE)
    assert response.status_code == 404
