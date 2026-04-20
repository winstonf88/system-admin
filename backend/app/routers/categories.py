from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_utils.cbv import cbv
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import TenantContext, get_db, get_tenant_context
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
    db: AsyncSession = Depends(get_db)
    tenant_context: TenantContext = Depends(get_tenant_context)

    def _siblings_where(self, parent_id: int | None):
        filters = [Category.tenant_id == self.tenant_context.tenant_id]
        if parent_id is None:
            filters.append(Category.parent_id.is_(None))
        else:
            filters.append(Category.parent_id == parent_id)
        return filters

    async def _get_category(self, category_id: int) -> Category | None:
        result = await self.db.execute(
            select(Category).where(
                Category.id == category_id,
                Category.tenant_id == self.tenant_context.tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def _get_category_or_404(self, category_id: int) -> Category:
        category = await self._get_category(category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")
        return category

    async def _list_siblings(self, parent_id: int | None) -> list[Category]:
        result = await self.db.execute(
            select(Category)
            .where(*self._siblings_where(parent_id))
            .order_by(Category.sort_order.asc(), Category.name.asc(), Category.id.asc())
        )
        return list(result.scalars().all())

    async def _next_sort_order(self, parent_id: int | None) -> int:
        value = await self.db.scalar(
            select(func.coalesce(func.max(Category.sort_order), -1)).where(
                *self._siblings_where(parent_id)
            )
        )
        return int(value) + 1

    async def _normalize_sibling_order(self, parent_id: int | None) -> None:
        siblings = await self._list_siblings(parent_id)
        for idx, sibling in enumerate(siblings):
            sibling.sort_order = idx

    async def _validate_parent(
        self,
        parent_id: int | None,
        category_id: int | None = None,
    ) -> None:
        if parent_id is None:
            return

        if category_id is not None and parent_id == category_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A categoria não pode ser pai de si mesma.")

        parent = await self._get_category(parent_id)
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria pai não encontrada.")

        # Prevent cycles by walking up the ancestry chain.
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
        category = Category(
            tenant_id=self.tenant_context.tenant_id,
            name=payload.name,
            parent_id=payload.parent_id,
            sort_order=await self._next_sort_order(payload.parent_id),
        )
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    @router.get("/", response_model=list[CategoryRead])
    async def list_categories(self) -> list[Category]:
        result = await self.db.execute(
            select(Category)
            .where(Category.tenant_id == self.tenant_context.tenant_id)
            .order_by(Category.parent_id.asc(), Category.sort_order.asc(), Category.name.asc(), Category.id.asc())
        )
        return list(result.scalars().all())

    @router.get("/tree", response_model=list[CategoryTreeRead])
    async def category_tree(self) -> list[CategoryTreeRead]:
        result = await self.db.execute(
            select(Category)
            .where(Category.tenant_id == self.tenant_context.tenant_id)
            .order_by(Category.parent_id.asc(), Category.sort_order.asc(), Category.name.asc(), Category.id.asc())
        )
        categories = list(result.scalars().all())

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
        if set(current_ids) != set(payload.ordered_ids) or len(current_ids) != len(payload.ordered_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova ordem deve conter exatamente as categorias irmãs atuais.",
            )

        category_by_id = {category.id: category for category in siblings}
        for idx, category_id in enumerate(payload.ordered_ids):
            category_by_id[category_id].sort_order = idx

        await self.db.commit()
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

        if "parent_id" in payload.model_fields_set and payload.parent_id != category.parent_id:
            await self._validate_parent(payload.parent_id, category_id=category_id)
            old_parent_id = category.parent_id
            category.parent_id = payload.parent_id
            category.sort_order = await self._next_sort_order(payload.parent_id)
            await self.db.flush()
            await self._normalize_sibling_order(old_parent_id)

        if payload.name is not None:
            category.name = payload.name

        await self.db.commit()
        await self.db.refresh(category)
        return category

    @router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_category(self, category_id: int) -> None:
        category = await self._get_category_or_404(category_id)

        has_child = await self.db.scalar(
            select(Category.id)
            .where(
                Category.parent_id == category_id,
                Category.tenant_id == self.tenant_context.tenant_id,
            )
            .limit(1)
        )
        if has_child:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exclua ou mova as subcategorias antes de excluir esta categoria.",
            )

        has_products = await self.db.scalar(
            select(ProductCategory.product_id)
            .where(
                ProductCategory.category_id == category_id,
                ProductCategory.tenant_id == self.tenant_context.tenant_id,
            )
            .limit(1)
        )
        if has_products:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exclua ou mova os produtos antes de excluir esta categoria.",
            )

        old_parent_id = category.parent_id
        await self.db.delete(category)
        await self.db.flush()
        await self._normalize_sibling_order(old_parent_id)
        await self.db.commit()
