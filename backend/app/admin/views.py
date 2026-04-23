from starlette_admin import BooleanField, EmailField, FloatField, IntegerField, StringField, TextAreaField

from app.admin.base import TortoiseModelView
from app.models.category import Category
from app.models.product import Product, ProductImage, ProductVariation
from app.models.tenant import Tenant
from app.models.user import User


class TenantView(TortoiseModelView):
    model = Tenant
    identity = "tenant"
    name = "Tenant"
    label = "Tenants"
    icon = "fa fa-building"
    pk_attr = "id"
    fields = [
        IntegerField("id", read_only=True),
        StringField("slug"),
        StringField("name"),
        BooleanField("is_active"),
    ]
    sortable_fields = ["id", "slug", "name", "is_active"]
    search_builder = True


class UserView(TortoiseModelView):
    model = User
    identity = "user"
    name = "User"
    label = "Users"
    icon = "fa fa-users"
    pk_attr = "id"
    fields = [
        IntegerField("id", read_only=True),
        EmailField("email"),
        StringField("first_name"),
        StringField("last_name"),
        IntegerField("tenant_id", label="Tenant ID"),
        BooleanField("is_active"),
    ]
    sortable_fields = ["id", "email", "first_name", "last_name", "is_active"]
    search_builder = True

    def can_create(self, request):
        return False


class CategoryView(TortoiseModelView):
    model = Category
    identity = "category"
    name = "Category"
    label = "Categories"
    icon = "fa fa-tags"
    pk_attr = "id"
    fields = [
        IntegerField("id", read_only=True),
        IntegerField("tenant_id", label="Tenant ID"),
        StringField("name"),
        IntegerField("parent_id", label="Parent ID"),
        IntegerField("sort_order"),
    ]
    sortable_fields = ["id", "tenant_id", "name", "sort_order"]
    search_builder = True


class ProductView(TortoiseModelView):
    model = Product
    identity = "product"
    name = "Product"
    label = "Products"
    icon = "fa fa-box"
    pk_attr = "id"
    fields = [
        IntegerField("id", read_only=True),
        IntegerField("tenant_id", label="Tenant ID"),
        StringField("name"),
        FloatField("price"),
        TextAreaField("description"),
        StringField("image_url"),
    ]
    sortable_fields = ["id", "tenant_id", "name", "price"]
    search_builder = True


class ProductImageView(TortoiseModelView):
    model = ProductImage
    identity = "product-image"
    name = "ProductImage"
    label = "Product Images"
    icon = "fa fa-image"
    pk_attr = "id"
    fields = [
        IntegerField("id", read_only=True),
        IntegerField("product_id", label="Product ID"),
        IntegerField("tenant_id", label="Tenant ID"),
        StringField("url"),
        IntegerField("sort_order"),
    ]
    sortable_fields = ["id", "product_id", "sort_order"]


class ProductVariationView(TortoiseModelView):
    model = ProductVariation
    identity = "product-variation"
    name = "ProductVariation"
    label = "Product Variations"
    icon = "fa fa-list"
    pk_attr = "id"
    fields = [
        IntegerField("id", read_only=True),
        IntegerField("product_id", label="Product ID"),
        StringField("size"),
        StringField("color"),
        IntegerField("quantity"),
    ]
    sortable_fields = ["id", "product_id", "quantity"]