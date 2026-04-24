from app.models import Category


async def create_category(
    *,
    tenant_id: int,
    name: str,
    parent_id: int | None = None,
    sort_order: int = 0,
    is_active: bool = True,
) -> Category:
    return await Category.create(
        tenant_id=tenant_id,
        name=name,
        parent_id=parent_id,
        sort_order=sort_order,
        is_active=is_active,
    )
