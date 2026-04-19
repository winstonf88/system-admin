from __future__ import annotations

import factory
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.security import hash_password
from app.models import User

from .tenant import TenantFactory

DEFAULT_TEST_PASSWORD = "secret"

AUTH_TENANT_ONE = ("u1@test.com", DEFAULT_TEST_PASSWORD)
AUTH_TENANT_TWO = ("u2@test.com", DEFAULT_TEST_PASSWORD)


class UserFactory(factory.Factory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@test.com")
    first_name = None
    last_name = None
    password_hash = factory.LazyFunction(lambda: hash_password(DEFAULT_TEST_PASSWORD))
    tenant_id = factory.Sequence(lambda n: n + 1)
    is_active = True


async def seed_two_tenant_users(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """Two tenants (id 1 and 2) and three users: u1/u2 active, inactive@ on tenant 1."""
    async with session_maker() as session:
        session.add_all(
            [
                TenantFactory.build(id=1, slug="t1", name="Tenant One"),
                TenantFactory.build(id=2, slug="t2", name="Tenant Two"),
            ]
        )
        session.add_all(
            [
                UserFactory.build(
                    email="u1@test.com",
                    tenant_id=1,
                    is_active=True,
                    first_name="User",
                    last_name="One",
                ),
                UserFactory.build(
                    email="u2@test.com",
                    tenant_id=2,
                    is_active=True,
                ),
                UserFactory.build(
                    email="inactive@test.com",
                    tenant_id=1,
                    is_active=False,
                ),
            ]
        )
        await session.commit()
