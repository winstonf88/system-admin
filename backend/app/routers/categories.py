from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_utils.cbv import cbv
from tortoise.functions import Max

from app.dependencies import TenantContext, get_tenant_context
from app.models import Category, ProductCategory
from app.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryReorder,
    CategoryTreeRead,
    CategoryUpdate,
)

router = APIRouter(prefix="/api/categories", tags=["categories"])


@cbv(router)
class CategoryView:
    tenant_context: TenantContext = Depends(get_tenant_context)

    def _siblings_filter(self, parent_id: int | None):
        filters = {"tenant_id": self.tenant_context.tenant_id}
        if parent_id is None:
            filters["parent_id__isnull"] = True
        else:
            filters["parent_id"] = parent_id
        return filters

    async def _get_category(self, category_id: int) -> Category | None:
        return await Category.get_or_none(
            id=category_id, tenant_id=self.tenant_context.tenant_id
        )

    async def _get_category_or_404(self, category_id: int) -> Category:
        category = await self._get_category(category_id)
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada.",
            )
        return category

    async def _list_siblings(self, parent_id: int | None) -> list[Category]:
        return await Category.filter(**self._siblings_filter(parent_id)).order_by(
            "sort_order", "name", "id"
        )

    async def _next_sort_order(self, parent_id: int | None) -> int:
        result = (
            await Category.filter(**self._siblings_filter(parent_id))
            .annotate(max_order=Max("sort_order"))
            .values("max_order")
        )
        current_max = result[0]["max_order"] if result else None
        return (current_max if current_max is not None else -1) + 1

    async def _normalize_sibling_order(self, parent_id: int | None) -> None:
        siblings = await self._list_siblings(parent_id)
        for idx, sibling in enumerate(siblings):
            sibling.sort_order = idx
            await sibling.save(update_fields=["sort_order"])

    async def _validate_parent(
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

        parent = await self._get_category(parent_id)
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
                cursor = await self._get_category(cursor.parent_id)
                if cursor is None:
                    break

    @router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
    async def create_category(self, payload: CategoryCreate) -> Category:
        await self._validate_parent(payload.parent_id)
        category = await Category.create(
            tenant_id=self.tenant_context.tenant_id,
            name=payload.name,
            parent_id=payload.parent_id,
            sort_order=await self._next_sort_order(payload.parent_id),
        )
        return category

    @router.get("/", response_model=list[CategoryRead])
    async def list_categories(self) -> list[Category]:
        return await Category.filter(
            tenant_id=self.tenant_context.tenant_id
        ).order_by("parent_id", "sort_order", "name", "id")

    @router.get("/tree", response_model=list[CategoryTreeRead])
    async def category_tree(self) -> list[CategoryTreeRead]:
        categories = await Category.filter(
            tenant_id=self.tenant_context.tenant_id
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

    @router.put("/order", response_model=list[CategoryRead])
    async def reorder_siblings(self, payload: CategoryReorder) -> list[Category]:
        siblings = await self._list_siblings(payload.parent_id)
        current_ids = [category.id for category in siblings]
        if set(current_ids) != set(payload.ordered_ids) or len(current_ids) != len(
            payload.ordered_ids
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova ordem deve conter exatamente as categorias irmãs atuais.",
            )

        category_by_id = {category.id: category for category in siblings}
        for idx, category_id in enumerate(payload.ordered_ids):
            category_by_id[category_id].sort_order = idx
            await category_by_id[category_id].save(update_fields=["sort_order"])

        return await self._list_siblings(payload.parent_id)

    @router.get("/{category_id}", response_model=CategoryRead)
    async def get_category(self, category_id: int) -> Category:
        return await self._get_category_or_404(category_id)

    @router.put("/{category_id}", response_model=CategoryRead)
    async def update_category(
        self,
        category_id: int,
        payload: CategoryUpdate,
    ) -> Category:
        category = await self._get_category_or_404(category_id)

        if (
            "parent_id" in payload.model_fields_set
            and payload.parent_id != category.parent_id
        ):
            await self._validate_parent(payload.parent_id, category_id=category_id)
            old_parent_id = category.parent_id
            category.parent_id = payload.parent_id
            category.sort_order = await self._next_sort_order(payload.parent_id)
            await category.save(update_fields=["parent_id", "sort_order"])
            await self._normalize_sibling_order(old_parent_id)

        if payload.name is not None:
            category.name = payload.name
            await category.save(update_fields=["name"])

        await category.refresh_from_db()
        return category

    @router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_category(self, category_id: int) -> None:
        category = await self._get_category_or_404(category_id)

        has_child = await Category.filter(
            parent_id=category_id,
            tenant_id=self.tenant_context.tenant_id,
        ).exists()
        if has_child:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exclua ou mova as subcategorias antes de excluir esta categoria.",
            )

        has_products = await ProductCategory.filter(
            category_id=category_id,
            tenant_id=self.tenant_context.tenant_id,
        ).exists()
        if has_products:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exclua ou mova os produtos antes de excluir esta categoria.",
            )

        old_parent_id = category.parent_id
        await category.delete()
        await self._normalize_sibling_order(old_parent_id)
