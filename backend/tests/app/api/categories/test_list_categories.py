import pytest

from app.models import Tenant
from tests.app.models.factories import AUTH_TENANT_ONE, create_category, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_categories_are_scoped_by_tenant(client) -> None:
    await seed_two_tenant_users()
    t1 = await Tenant.get(slug="t1")
    t2 = await Tenant.get(slug="t2")
    await create_category(tenant_id=t1.id, name="Tenant 1 Root")
    await create_category(tenant_id=t2.id, name="Tenant 2 Root")

    response = await client.get("/api/categories/", auth=AUTH_TENANT_ONE)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "Tenant 1 Root"
