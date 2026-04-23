from fastapi import APIRouter, Depends, HTTPException, status

from app.models import Category
from app.routers.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryRead, CategoryReorder

router = APIRouter()


@router.put("/order", response_model=list[CategoryRead])
async def reorder_siblings(
    payload: CategoryReorder,
    service: CategoriesService = Depends(get_categories_service),
) -> list[Category]:
    siblings = await service.list_siblings(payload.parent_id)
    current_ids = [category.id for category in siblings]
    if set(current_ids) != set(payload.ordered_ids) or len(current_ids) != len(payload.ordered_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova ordem deve conter exatamente as categorias irmãs atuais.",
        )

    category_by_id = {category.id: category for category in siblings}
    for idx, category_id in enumerate(payload.ordered_ids):
        category_by_id[category_id].sort_order = idx
        await category_by_id[category_id].save(update_fields=["sort_order"])

    return await service.list_siblings(payload.parent_id)
