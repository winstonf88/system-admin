import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.app.models.factories import seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_api_requires_auth(client, session_maker: async_sessionmaker[AsyncSession]) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.get("/api/categories/")
    assert response.status_code == 401


async def test_api_rejects_wrong_password(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.get("/api/categories/", auth=("u1@test.com", "wrong"))
    assert response.status_code == 401


async def test_inactive_user_forbidden(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    response = await client.get("/api/categories/", auth=("inactive@test.com", "secret"))
    assert response.status_code == 403
