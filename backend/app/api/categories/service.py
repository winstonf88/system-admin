from fastapi import Depends, HTTPException, status
from tortoise.functions import Max

from app.dependencies import TenantContext, get_tenant_context
from app.models import Category


class CategoriesService:
    def __init__(self, tenant_context: TenantContext) -> None:
        self.tenant_context = tenant_context

    def _siblings_filter(self, parent_id: int | None) -> dict:
        filters = {"tenant_id": self.tenant_context.tenant_id}
        if parent_id is None:
            filters["parent_id__isnull"] = True
        else:
            filters["parent_id"] = parent_id
        return filters

    async def get_category(self, category_id: int) -> Category | None:
        return await Category.get_or_none(
            id=category_id, tenant_id=self.tenant_context.tenant_id
        )

    async def get_category_or_404(self, category_id: int) -> Category:
        category = await self.get_category(category_id)
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada.",
            )
        return category

    async def list_siblings(self, parent_id: int | None) -> list[Category]:
        return await Category.filter(**self._siblings_filter(parent_id)).order_by(
            "sort_order", "name", "id"
        )

    async def next_sort_order(self, parent_id: int | None) -> int:
        result = (
            await Category.filter(**self._siblings_filter(parent_id))
            .annotate(max_order=Max("sort_order"))
            .values("max_order")
        )
        current_max = result[0]["max_order"] if result else None
        return (current_max if current_max is not None else -1) + 1

    async def normalize_sibling_order(self, parent_id: int | None) -> None:
        siblings = await self.list_siblings(parent_id)
        for idx, sibling in enumerate(siblings):
            sibling.sort_order = idx
            await sibling.save(update_fields=["sort_order"])

    async def validate_parent(
        self,
        parent_id: int | None,
        category_id: int | None = None,
    ) -> None:
        if parent_id is None:
            return

        if category_id is not None and parent_id == category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A categoria não pode ser pai de si mesma.",
            )

        parent = await self.get_category(parent_id)
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria pai não encontrada.",
            )

        if category_id is not None:
            cursor = parent
            while cursor.parent_id is not None:
                if cursor.parent_id == category_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Categoria pai inválida; isso criaria um ciclo.",
                    )
                cursor = await self.get_category(cursor.parent_id)
                if cursor is None:
                    break


def get_categories_service(
    tenant_context: TenantContext = Depends(get_tenant_context),
) -> CategoriesService:
    return CategoriesService(tenant_context=tenant_context)
