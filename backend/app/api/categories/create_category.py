from fastapi import APIRouter, Depends, status

from app.models import Category
from app.routers.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryCreate, CategoryRead

router = APIRouter()


@router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    service: CategoriesService = Depends(get_categories_service),
) -> Category:
    await service.validate_parent(payload.parent_id)
    return await Category.create(
        tenant_id=service.tenant_context.tenant_id,
        name=payload.name,
        parent_id=payload.parent_id,
        sort_order=await service.next_sort_order(payload.parent_id),
    )
