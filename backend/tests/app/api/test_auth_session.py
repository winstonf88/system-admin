import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.app.models.factories import seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_auth_session_requires_credentials(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.get("/api/auth/session")
    assert response.status_code == 401


async def test_auth_session_rejects_wrong_password(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.get("/api/auth/session", auth=("u1@test.com", "wrong"))
    assert response.status_code == 401


async def test_auth_session_inactive_forbidden(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.get("/api/auth/session", auth=("inactive@test.com", "secret"))
    assert response.status_code == 403


async def test_auth_session_ok(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.get("/api/auth/session", auth=("u1@test.com", "secret"))
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "id": 1,
        "email": "u1@test.com",
        "first_name": "User",
        "last_name": "One",
        "is_active": True,
    }
