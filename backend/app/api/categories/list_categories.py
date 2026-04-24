from fastapi import APIRouter, Depends

from app.api.categories.service import (
    CategoryFilters,
    CategoriesService,
    get_categories_service,
)
from app.schemas import CategoryRead

router = APIRouter()


@router.get("/", response_model=list[CategoryRead])
async def list_categories(
    filters: CategoryFilters = Depends(),
    service: CategoriesService = Depends(get_categories_service),
) -> list:
    return await service.filter_categories(filters)
