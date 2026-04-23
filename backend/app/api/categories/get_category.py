from fastapi import APIRouter, Depends

from app.models import Category
from app.routers.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryRead

router = APIRouter()


@router.get("/{category_id}", response_model=CategoryRead)
async def get_category(
    category_id: int,
    service: CategoriesService = Depends(get_categories_service),
) -> Category:
    return await service.get_category_or_404(category_id)
