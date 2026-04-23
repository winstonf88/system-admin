from tortoise import Tortoise
from tortoise.exceptions import OperationalError

from app.core.config import get_settings

settings = get_settings()

TORTOISE_ORM = {
    "connections": {"default": settings.database_url},
    "apps": {
        "models": {
            "models": [
                "app.models.tenant",
                "app.models.user",
                "app.models.category",
                "app.models.product",
                "aerich.models",
            ],
            "default_connection": "default",
        }
    },
}


async def init_db() -> None:
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db() -> None:
    await Tortoise.close_connections()


async def check_db_connection() -> None:
    try:
        conn = Tortoise.get_connection("default")
        await conn.execute_query("SELECT 1")
    except (OperationalError, Exception) as exc:
        raise RuntimeError("Database connection check failed") from exc
