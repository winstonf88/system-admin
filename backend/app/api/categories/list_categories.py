from fastapi import APIRouter, Depends, Query

from app.models import Category
from app.api.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryRead

router = APIRouter()


@router.get("/", response_model=list[CategoryRead])
async def list_categories(
    is_active: bool | None = Query(default=None),
    service: CategoriesService = Depends(get_categories_service),
) -> list[Category]:
    filters: dict = {"tenant_id": service.tenant_context.tenant_id}
    if is_active is not None:
        filters["is_active"] = is_active
    return await Category.filter(**filters).order_by("parent_id", "sort_order", "name", "id")
