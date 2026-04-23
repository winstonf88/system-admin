from fastapi import APIRouter, Depends

from app.models import Category
from app.routers.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryRead

router = APIRouter()


@router.get("/", response_model=list[CategoryRead])
async def list_categories(
    service: CategoriesService = Depends(get_categories_service),
) -> list[Category]:
    return await Category.filter(
        tenant_id=service.tenant_context.tenant_id
    ).order_by("parent_id", "sort_order", "name", "id")
