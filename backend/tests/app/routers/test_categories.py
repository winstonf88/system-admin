import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import ProductCategory
from tests.app.models.factories import AUTH_TENANT_ONE, CategoryFactory, ProductFactory, seed_two_tenant_users

pytestmark = pytest.mark.asyncio


async def test_categories_are_scoped_by_tenant(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        session.add_all(
            [
                CategoryFactory.build(tenant_id=1, name="Tenant 1 Root", parent_id=None),
                CategoryFactory.build(tenant_id=2, name="Tenant 2 Root", parent_id=None),
            ]
        )
        await session.commit()

    response = await client.get("/api/categories/", auth=AUTH_TENANT_ONE)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "Tenant 1 Root"


async def test_delete_category_is_blocked_when_linked_to_products(
    client, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await seed_two_tenant_users(session_maker)
    async with session_maker() as session:
        category = CategoryFactory.build(tenant_id=1, name="Com vínculo", parent_id=None)
        product = ProductFactory.build(
            tenant_id=1,
            name="Produto ligado",
            description=None,
            image_url=None,
        )
        session.add_all([category, product])
        await session.flush()
        session.add(ProductCategory(product_id=product.id, category_id=category.id, tenant_id=1))
        await session.commit()

    response = await client.delete(f"/api/categories/{category.id}", auth=AUTH_TENANT_ONE)
    assert response.status_code == 400
    assert "Exclua ou mova os produtos" in response.json()["detail"]
