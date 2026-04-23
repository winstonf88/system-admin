from starlette_admin import BaseAdmin

from app.admin.auth import AdminAuthProvider
from app.admin.views import (
    CategoryView,
    ProductImageView,
    ProductVariationView,
    ProductView,
    TenantView,
    UserView,
)


def create_admin(app) -> BaseAdmin:
    admin = BaseAdmin(title="System Admin", auth_provider=AdminAuthProvider())
    admin.add_view(TenantView())
    admin.add_view(UserView())
    admin.add_view(CategoryView())
    admin.add_view(ProductView())
    admin.add_view(ProductImageView())
    admin.add_view(ProductVariationView())

    admin.mount_to(app)

    return admin

