from __future__ import annotations

from app.core.security import hash_password
from app.models import Tenant, User

DEFAULT_TEST_PASSWORD = "secret"

AUTH_TENANT_ONE = ("u1@test.com", DEFAULT_TEST_PASSWORD)
AUTH_TENANT_TWO = ("u2@test.com", DEFAULT_TEST_PASSWORD)


async def seed_two_tenant_users() -> None:
    """Two tenants (id-stable by slug) and three users: u1/u2 active, inactive@ on tenant 1."""
    t1 = await Tenant.create(slug="t1", name="Tenant One", is_active=True)
    t2 = await Tenant.create(slug="t2", name="Tenant Two", is_active=True)

    pw = hash_password(DEFAULT_TEST_PASSWORD)
    await User.create(email="u1@test.com", password_hash=pw, tenant_id=t1.id, is_active=True, first_name="User", last_name="One")
    await User.create(email="u2@test.com", password_hash=pw, tenant_id=t2.id, is_active=True)
    await User.create(email="inactive@test.com", password_hash=pw, tenant_id=t1.id, is_active=False)
