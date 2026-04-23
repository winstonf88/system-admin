from fastapi import APIRouter, Depends

from app.models import Category
from app.routers.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryTreeRead

router = APIRouter()


@router.get("/tree", response_model=list[CategoryTreeRead])
async def category_tree(
    service: CategoriesService = Depends(get_categories_service),
) -> list[CategoryTreeRead]:
    categories = await Category.filter(
        tenant_id=service.tenant_context.tenant_id
    ).order_by("parent_id", "sort_order", "name", "id")

    node_map: dict[int, CategoryTreeRead] = {
        category.id: CategoryTreeRead(
            id=category.id,
            name=category.name,
            parent_id=category.parent_id,
            sort_order=category.sort_order,
        )
        for category in categories
    }
    roots: list[CategoryTreeRead] = []

    for category in categories:
        node = node_map[category.id]
        if category.parent_id and category.parent_id in node_map:
            node_map[category.parent_id].subcategories.append(node)
        else:
            roots.append(node)

    return roots
