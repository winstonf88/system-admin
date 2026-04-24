import pytest

from app.models import Tenant
from tests.app.models.factories import seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_auth_session_requires_credentials(client) -> None:
    await seed_two_tenant_users()
    response = await client.get("/api/auth/session")
    assert response.status_code == 401


async def test_auth_session_rejects_wrong_password(client) -> None:
    await seed_two_tenant_users()
    response = await client.get("/api/auth/session", auth=("u1@test.com", "wrong"))
    assert response.status_code == 401


async def test_auth_session_inactive_forbidden(client) -> None:
    await seed_two_tenant_users()
    response = await client.get(
        "/api/auth/session", auth=("inactive@test.com", "secret")
    )
    assert response.status_code == 403


async def test_auth_session_inactive_tenant_forbidden(client) -> None:
    await seed_two_tenant_users()
    await Tenant.filter(slug="t1").update(is_active=False)

    response = await client.get("/api/auth/session", auth=("u1@test.com", "secret"))
    assert response.status_code == 403


async def test_auth_session_ok(client) -> None:
    await seed_two_tenant_users()
    response = await client.get("/api/auth/session", auth=("u1@test.com", "secret"))
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "id": data["id"],
        "email": "u1@test.com",
        "first_name": "User",
        "last_name": "One",
        "is_active": True,
        "tenant_name": "Tenant One",
    }
