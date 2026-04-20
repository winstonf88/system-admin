from collections.abc import AsyncGenerator

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


async def check_db_connection() -> None:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise RuntimeError("Database connection check failed") from exc
