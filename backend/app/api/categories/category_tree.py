from fastapi import APIRouter, Depends
from tortoise.functions import Count

from app.models import Category
from app.models.product import ProductCategory
from app.api.categories.service import CategoriesService, get_categories_service
from app.schemas import CategoryTreeRead

router = APIRouter()


@router.get("/tree", response_model=list[CategoryTreeRead])
async def category_tree(
    service: CategoriesService = Depends(get_categories_service),
) -> list[CategoryTreeRead]:
    tenant_id = service.tenant_context.tenant_id
    categories = await Category.filter(tenant_id=tenant_id).order_by(
        "parent_id", "sort_order", "name", "id"
    )

    counts = await (
        ProductCategory.filter(tenant_id=tenant_id)
        .annotate(count=Count("id"))
        .group_by("category_id")
        .values("category_id", "count")
    )
    count_by_category: dict[int, int] = {row["category_id"]: row["count"] for row in counts}

    node_map: dict[int, CategoryTreeRead] = {
        category.id: CategoryTreeRead(
            id=category.id,
            name=category.name,
            parent_id=category.parent_id,
            sort_order=category.sort_order,
            is_active=category.is_active,
            product_count=count_by_category.get(category.id, 0),
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
