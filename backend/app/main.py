from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.admin import create_admin
from app.api import (
    auth_router,
    categories_router,
    products_router,
    tenant_router,
    users_router,
)
from app.core.config import get_settings
from app.core.database import check_db_connection, close_db, init_db
from app.core.logging import configure_logging
from app.core.storage import get_storage_backend

settings = get_settings()
UPLOADS_DIR = Path("uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.app_log_level)
    app.state.storage = get_storage_backend(settings)
    await init_db()
    await check_db_connection()
    yield
    await close_db()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        docs_url="/docs" if settings.app_expose_docs else None,
        redoc_url="/redoc" if settings.app_expose_docs else None,
        openapi_url="/openapi.json" if settings.app_expose_docs else None,
        lifespan=lifespan,
    )

    app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.app_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "environment": settings.app_env}

    if settings.app_enable_admin:
        create_admin(app)

    if settings.storage_backend == "local":
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
    app.include_router(auth_router)
    app.include_router(categories_router)
    app.include_router(products_router)
    app.include_router(tenant_router)
    app.include_router(users_router)

    return app


app = create_app()
