from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api import categories_router, products_router
from app.core.database import get_db
from app.models import Base, Category, Product, ProductVariation, Tenant


@pytest_asyncio.fixture
async def session_maker() -> AsyncGenerator[async_sessionmaker[AsyncSession], None]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    maker = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
    try:
        yield maker
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def app(session_maker: async_sessionmaker[AsyncSession]) -> FastAPI:
    app = FastAPI()
    app.include_router(categories_router)
    app.include_router(products_router)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client


async def _seed_tenants(session_maker: async_sessionmaker[AsyncSession]) -> None:
    async with session_maker() as session:
        session.add_all(
            [
                Tenant(id=1, slug="t1", name="Tenant One"),
                Tenant(id=2, slug="t2", name="Tenant Two"),
            ]
        )
        await session.commit()


@pytest.mark.asyncio
async def test_categories_are_scoped_by_tenant(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await _seed_tenants(session_maker)
    async with session_maker() as session:
        session.add_all(
            [
                Category(tenant_id=1, name="Tenant 1 Root", parent_id=None),
                Category(tenant_id=2, name="Tenant 2 Root", parent_id=None),
            ]
        )
        await session.commit()

    response = await client.get("/api/categories/", headers={"X-Tenant-ID": "1"})
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "Tenant 1 Root"


@pytest.mark.asyncio
async def test_product_lookup_blocks_cross_tenant_access(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await _seed_tenants(session_maker)
    async with session_maker() as session:
        tenant1_category = Category(tenant_id=1, name="T1 Cat", parent_id=None)
        tenant2_category = Category(tenant_id=2, name="T2 Cat", parent_id=None)
        session.add_all([tenant1_category, tenant2_category])
        await session.flush()
        tenant2_product = Product(
            tenant_id=2,
            name="Tenant 2 Product",
            description=None,
            category_id=tenant2_category.id,
            image_url=None,
        )
        session.add(tenant2_product)
        await session.flush()
        product_id = tenant2_product.id
        await session.commit()

    response = await client.get(f"/api/products/{product_id}", headers={"X-Tenant-ID": "1"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_upload_url_stays_tenant_agnostic_and_enforced(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    await _seed_tenants(session_maker)
    async with session_maker() as session:
        category_1 = Category(tenant_id=1, name="T1 Cat", parent_id=None)
        category_2 = Category(tenant_id=2, name="T2 Cat", parent_id=None)
        session.add_all([category_1, category_2])
        await session.flush()
        product_1 = Product(
            tenant_id=1,
            name="Tenant 1 Product",
            description=None,
            category_id=category_1.id,
            image_url=None,
        )
        product_2 = Product(
            tenant_id=2,
            name="Tenant 2 Product",
            description=None,
            category_id=category_2.id,
            image_url=None,
        )
        session.add_all([product_1, product_2])
        await session.commit()

    own_upload = await client.post(
        f"/api/products/{product_1.id}/upload",
        headers={"X-Tenant-ID": "1"},
        files={"file": ("image.png", b"fake-bytes", "image/png")},
    )
    assert own_upload.status_code == 200
    own_url = own_upload.json()["file_url"]
    assert own_url.startswith("/uploads/products/")
    assert "/uploads/1/" not in own_url

    cross_tenant_upload = await client.post(
        f"/api/products/{product_2.id}/upload",
        headers={"X-Tenant-ID": "1"},
        files={"file": ("image.png", b"fake-bytes", "image/png")},
    )
    assert cross_tenant_upload.status_code == 404


def test_schema_has_tenant_columns_and_constraints() -> None:
    category_cols = Category.__table__.c
    product_cols = Product.__table__.c

    assert "tenant_id" in category_cols
    assert "tenant_id" in product_cols
    assert "tenant_id" not in ProductVariation.__table__.c
    assert not category_cols["tenant_id"].nullable
    assert not product_cols["tenant_id"].nullable

    category_unique_sets = [
        tuple(column.name for column in constraint.columns)
        for constraint in Category.__table__.constraints
        if constraint.__class__.__name__ == "UniqueConstraint"
    ]
    assert ("tenant_id", "name", "parent_id") in category_unique_sets
