from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_utils.cbv import cbv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.tenant import TenantContext, get_tenant_context
from app.models import Category, Product
from app.schemas import CategoryCreate, CategoryRead, CategoryTreeRead, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])

@cbv(router)
class CategoryView:
    db: AsyncSession = Depends(get_db)
    tenant_context: TenantContext = Depends(get_tenant_context)

    async def _get_category(self, category_id: int) -> Category | None:
        result = await self.db.execute(
            select(Category).where(
                Category.id == category_id,
                Category.tenant_id == self.tenant_context.tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def _validate_parent(
        self,        
        parent_id: int | None,
        category_id: int | None = None,
    ) -> None:
        if parent_id is None:
            return

        if category_id is not None and parent_id == category_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category cannot be its own parent.")

        parent = await self._get_category(parent_id)
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent category not found.")

        # Prevent cycles by walking up the ancestry chain.
        if category_id is not None:
            cursor = parent
            while cursor.parent_id is not None:
                if cursor.parent_id == category_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid parent category; this would create a cycle.",
                    )
                cursor = await self._get_category(cursor.parent_id)
                if cursor is None:
                    break

    async def _get_category_or_404(self, category_id: int) -> Category:
        category = await self._get_category(category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
        return category

    @router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
    async def create_category(self, payload: CategoryCreate) -> Category:
        await self._validate_parent(payload.parent_id)
        category = Category(
            tenant_id=self.tenant_context.tenant_id,
            name=payload.name,
            parent_id=payload.parent_id,
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
            .order_by(Category.name.asc())
        )
        return list(result.scalars().all())

    @router.get("/tree", response_model=list[CategoryTreeRead])
    async def category_tree(self) -> list[CategoryTreeRead]:
        result = await self.db.execute(
            select(Category)
            .where(Category.tenant_id == self.tenant_context.tenant_id)
            .order_by(Category.name.asc())
        )
        categories = list(result.scalars().all())

        node_map: dict[int, CategoryTreeRead] = {
            category.id: CategoryTreeRead(id=category.id, name=category.name, parent_id=category.parent_id)
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

        if "parent_id" in payload.model_fields_set:
            await self._validate_parent(payload.parent_id, category_id=category_id)
            category.parent_id = payload.parent_id

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
                detail="Delete or move subcategories before deleting this category.",
            )

        has_products = await self.db.scalar(
            select(Product.id)
            .where(
                Product.category_id == category_id,
                Product.tenant_id == self.tenant_context.tenant_id,
            )
            .limit(1)
        )
        if has_products:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delete or move products before deleting this category.",
            )

        await self.db.delete(category)
        await self.db.commit()
