from fastapi import APIRouter, Depends

from app.models import Category
from app.routers.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryRead, CategoryUpdate

router = APIRouter()


@router.put("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    service: CategoriesService = Depends(get_categories_service),
) -> Category:
    category = await service.get_category_or_404(category_id)

    if (
        "parent_id" in payload.model_fields_set
        and payload.parent_id != category.parent_id
    ):
        await service.validate_parent(payload.parent_id, category_id=category_id)
        old_parent_id = category.parent_id
        category.parent_id = payload.parent_id
        category.sort_order = await service.next_sort_order(payload.parent_id)
        await category.save(update_fields=["parent_id", "sort_order"])
        await service.normalize_sibling_order(old_parent_id)

    if payload.name is not None:
        category.name = payload.name
        await category.save(update_fields=["name"])

    await category.refresh_from_db()
    return category
