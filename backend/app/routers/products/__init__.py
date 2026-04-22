from fastapi import APIRouter

from app.routers.products.common import ProductsService
from app.schemas import ProductAISuggestionOutput
from app.routers.products.create_product import router as create_product_router
from app.routers.products.delete_product import router as delete_product_router
from app.routers.products.delete_product_image import (
    router as delete_product_image_router,
)
from app.routers.products.get_product import router as get_product_router
from app.routers.products.list_products import router as list_products_router
from app.routers.products.reorder_product_images import (
    router as reorder_product_images_router,
)
from app.routers.products.suggest_product_fields import (
    router as suggest_product_fields_router,
)
from app.routers.products.update_product import router as update_product_router
from app.routers.products.upload_product_file import (
    router as upload_product_file_router,
)

router = APIRouter(prefix="/api/products", tags=["products"])
router.include_router(create_product_router)
router.include_router(suggest_product_fields_router)
router.include_router(list_products_router)
router.include_router(get_product_router)
router.include_router(update_product_router)
router.include_router(delete_product_router)
router.include_router(upload_product_file_router)
router.include_router(delete_product_image_router)
router.include_router(reorder_product_images_router)

__all__ = ["ProductAISuggestionOutput", "ProductsService", "router"]
