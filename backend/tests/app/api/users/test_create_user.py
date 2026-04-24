import pytest

from tests.app.models.factories import AUTH_TENANT_ONE, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


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
