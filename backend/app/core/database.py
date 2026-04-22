from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine_kwargs: dict[str, int | bool] = {"pool_pre_ping": True}
if not settings.database_url.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_size": settings.db_pool_size,
            "max_overflow": settings.db_max_overflow,
            "pool_timeout": settings.db_pool_timeout,
            "pool_recycle": settings.db_pool_recycle,
        }
    )

engine = create_async_engine(settings.database_url, **engine_kwargs)
SessionLocal = async_sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def migrate_legacy_product_images(connection) -> None:
    """Copy legacy ``products.image_url`` into ``product_images`` when missing (idempotent)."""
    await connection.execute(
        text("""
        INSERT INTO product_images (tenant_id, product_id, url, sort_order)
        SELECT tenant_id, id, image_url, 0
        FROM products
        WHERE image_url IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM product_images pi
            WHERE pi.product_id = products.id AND pi.tenant_id = products.tenant_id
        )
        """)
    )


def _has_column(connection, table_name: str, column_name: str) -> bool:
    inspector = inspect(connection)
    columns: list[dict[str, Any]] = inspector.get_columns(table_name)
    return any(column.get("name") == column_name for column in columns)


async def migrate_category_sort_order(connection) -> None:
    """Add and initialize ``categories.sort_order`` if it does not exist."""

    has_sort_order = await connection.run_sync(
        lambda sync_connection: _has_column(sync_connection, "categories", "sort_order")
    )
    if has_sort_order:
        return

    await connection.execute(
        text("ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0")
    )
    rows = await connection.execute(
        text("""
        SELECT id, parent_id
        FROM categories
        ORDER BY
            CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
            parent_id,
            id
        """)
    )

    next_sort_order: dict[int | None, int] = {}
    updates: list[dict[str, int]] = []
    for category_id, parent_id in rows.fetchall():
        idx = next_sort_order.get(parent_id, 0)
        updates.append({"id": int(category_id), "sort_order": idx})
        next_sort_order[parent_id] = idx + 1

    if updates:
        await connection.execute(
            text("UPDATE categories SET sort_order = :sort_order WHERE id = :id"),
            updates,
        )


async def migrate_product_price_column(connection) -> None:
    """Add and initialize ``products.price`` if it does not exist."""

    has_price = await connection.run_sync(
        lambda sync_connection: _has_column(sync_connection, "products", "price")
    )
    if has_price:
        return

    await connection.execute(
        text("ALTER TABLE products ADD COLUMN price FLOAT NOT NULL DEFAULT 0")
    )


async def check_db_connection() -> None:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise RuntimeError("Database connection check failed") from exc
