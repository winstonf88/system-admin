from app.routers.auth import router as auth_router
from app.routers.categories import router as categories_router
from app.routers.products import router as products_router
from app.routers.tenant import router as tenant_router
from app.routers.users import router as users_router

__all__ = [
    "auth_router",
    "categories_router",
    "products_router",
    "tenant_router",
    "users_router",
]
