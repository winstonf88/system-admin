from fastapi import APIRouter, Depends, HTTPException, status

from app.models import Category, ProductCategory
from app.routers.categories.service import CategoriesService, get_categories_service

router = APIRouter()


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    service: CategoriesService = Depends(get_categories_service),
) -> None:
    category = await service.get_category_or_404(category_id)

    if await Category.filter(
        parent_id=category_id,
        tenant_id=service.tenant_context.tenant_id,
    ).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exclua ou mova as subcategorias antes de excluir esta categoria.",
        )

    if await ProductCategory.filter(
        category_id=category_id,
        tenant_id=service.tenant_context.tenant_id,
    ).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exclua ou mova os produtos antes de excluir esta categoria.",
        )

    old_parent_id = category.parent_id
    await category.delete()
    await service.normalize_sibling_order(old_parent_id)
