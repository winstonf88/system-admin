from app.api.auth import router as auth_router
from app.api.categories import router as categories_router
from app.api.products import router as products_router
from app.api.users import router as users_router

__all__ = ["auth_router", "categories_router", "products_router", "users_router"]
