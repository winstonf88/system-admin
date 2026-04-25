from app.schemas.auth import AuthSessionRead
from app.schemas.tenant import TenantRead, TenantUpdate
from app.schemas.categories import (
    CategoryCreate,
    CategoryReorder,
    CategoryRead,
    CategoryTreeRead,
    CategoryUpdate,
)
from app.schemas.products import (
    ProductAISuggestionOutput,
    ProductAISuggestionsResponse,
    ProductCreate,
    ProductImageOrderUpdate,
    ProductImageRead,
    ProductListResponse,
    ProductRead,
    ProductSuggestionField,
    ProductUpdate,
    ProductVariationCreate,
    ProductVariationRead,
    UploadResponse,
)
from app.schemas.users import UserCreate, UserRead, UserUpdate

CategoryTreeRead.model_rebuild()

__all__ = [
    "AuthSessionRead",
    "TenantRead",
    "TenantUpdate",
    "CategoryCreate",
    "CategoryReorder",
    "CategoryRead",
    "CategoryTreeRead",
    "CategoryUpdate",
    "ProductCreate",
    "ProductAISuggestionOutput",
    "ProductAISuggestionsResponse",
    "ProductImageOrderUpdate",
    "ProductImageRead",
    "ProductListResponse",
    "ProductRead",
    "ProductSuggestionField",
    "ProductUpdate",
    "ProductVariationCreate",
    "ProductVariationRead",
    "UploadResponse",
    "UserCreate",
    "UserRead",
    "UserUpdate",
]
