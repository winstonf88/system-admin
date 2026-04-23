from fastapi import APIRouter

from app.routers.categories.category_tree import router as category_tree_router
from app.routers.categories.create_category import router as create_category_router
from app.routers.categories.delete_category import router as delete_category_router
from app.routers.categories.get_category import router as get_category_router
from app.routers.categories.list_categories import router as list_categories_router
from app.routers.categories.reorder_categories import router as reorder_categories_router
from app.routers.categories.update_category import router as update_category_router

router = APIRouter(prefix="/api/categories", tags=["categories"])
router.include_router(list_categories_router)
router.include_router(category_tree_router)
router.include_router(create_category_router)
router.include_router(reorder_categories_router)
router.include_router(get_category_router)
router.include_router(update_category_router)
router.include_router(delete_category_router)

__all__ = ["router"]
