import uuid
from pathlib import Path

from fastapi import Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import TenantContext, get_db, get_tenant_context
from app.models import (
    Category,
    Product,
    ProductCategory,
    ProductImage,
    ProductVariation,
)
from app.schemas import (
    ProductCreate,
    ProductImageRead,
    ProductRead,
    ProductUpdate,
    ProductVariationCreate,
    ProductVariationRead,
)

MAX_IMAGES_PER_PRODUCT = 10

UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class ProductAISuggestionOutput(BaseModel):
    name: list[str] = Field(default_factory=list)
    description: list[str] = Field(default_factory=list)
    category: list[int] = Field(default_factory=list)


def delete_upload_file_if_safe(url: str) -> None:
    if not url.startswith("/uploads/products/"):
        return
    relative = url.removeprefix("/uploads/")
    path = Path("uploads") / relative
    if path.is_file():
        path.unlink()


class ProductsService:
    def __init__(self, db: AsyncSession, tenant_context: TenantContext) -> None:
        self.db = db
        self.tenant_context = tenant_context

    def product_to_read(self, product: Product) -> ProductRead:
        category_ids = sorted({link.category_id for link in product.category_links})
        sorted_imgs = sorted(product.images, key=lambda x: x.sort_order)
        image_reads = [ProductImageRead.model_validate(i) for i in sorted_imgs]
        primary_url = image_reads[0].url if image_reads else product.image_url
        return ProductRead(
            id=product.id,
            name=product.name,
            description=product.description,
            image_url=primary_url,
            images=image_reads,
            category_ids=category_ids,
            variations=[
                ProductVariationRead.model_validate(v) for v in product.variations
            ],
        )

    async def get_product_or_404(self, product_id: int) -> Product:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.variations),
                selectinload(Product.category_links),
                selectinload(Product.images),
            )
            .where(
                Product.id == product_id,
                Product.tenant_id == self.tenant_context.tenant_id,
            )
        )
        product = result.scalar_one_or_none()
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado."
            )
        return product

    async def validate_categories(self, category_ids: list[int]) -> None:
        if not category_ids:
            return
        result = await self.db.execute(
            select(Category.id).where(
                Category.id.in_(category_ids),
                Category.tenant_id == self.tenant_context.tenant_id,
            )
        )
        found = {row[0] for row in result.all()}
        missing = set(category_ids) - found
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada.",
            )

    async def list_tenant_categories(self) -> list[Category]:
        result = await self.db.execute(
            select(Category)
            .where(Category.tenant_id == self.tenant_context.tenant_id)
            .order_by(
                Category.parent_id.asc(),
                Category.sort_order.asc(),
                Category.name.asc(),
                Category.id.asc(),
            )
        )
        return list(result.scalars().all())

    @staticmethod
    def sanitize_text_suggestions(
        values: list[str] | None,
        *,
        limit: int,
    ) -> list[str]:
        if not values:
            return []
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in values:
            item = raw.strip()
            if not item:
                continue
            key = item.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(item)
            if len(normalized) >= limit:
                break
        return normalized

    @staticmethod
    def sanitize_category_suggestions(
        values: list[int] | None,
        *,
        allowed_category_ids: set[int],
    ) -> list[int]:
        if not values:
            return []
        normalized: list[int] = []
        seen: set[int] = set()
        for raw in values:
            if raw in seen or raw not in allowed_category_ids:
                continue
            seen.add(raw)
            normalized.append(raw)
        return normalized

    def replace_variations(
        self,
        product: Product,
        payload_variations: list[ProductVariationCreate],
    ) -> None:
        product.variations.clear()
        for variation in payload_variations:
            product.variations.append(
                ProductVariation(
                    size=variation.size,
                    color=variation.color,
                    quantity=variation.quantity,
                )
            )

    async def create_product(self, payload: ProductCreate) -> ProductRead:
        await self.validate_categories(payload.category_ids)

        product = Product(
            tenant_id=self.tenant_context.tenant_id,
            name=payload.name,
            description=payload.description,
            image_url=payload.image_url,
        )
        for category_id in payload.category_ids:
            product.category_links.append(
                ProductCategory(
                    tenant_id=self.tenant_context.tenant_id,
                    category_id=category_id,
                )
            )

        for variation in payload.variations:
            product.variations.append(
                ProductVariation(
                    size=variation.size,
                    color=variation.color,
                    quantity=variation.quantity,
                )
            )

        self.db.add(product)
        await self.db.commit()
        created = await self.get_product_or_404(product.id)
        return self.product_to_read(created)

    async def update_product(
        self, product_id: int, payload: ProductUpdate
    ) -> ProductRead:
        product = await self.get_product_or_404(product_id)

        if (
            "category_ids" in payload.model_fields_set
            and payload.category_ids is not None
        ):
            await self.validate_categories(payload.category_ids)
            product.category_links.clear()
            for category_id in payload.category_ids:
                product.category_links.append(
                    ProductCategory(
                        tenant_id=self.tenant_context.tenant_id,
                        category_id=category_id,
                    )
                )

        if "name" in payload.model_fields_set and payload.name is not None:
            product.name = payload.name

        if "description" in payload.model_fields_set:
            product.description = payload.description

        if "image_url" in payload.model_fields_set:
            product.image_url = payload.image_url

        if "variations" in payload.model_fields_set and payload.variations is not None:
            self.replace_variations(product, payload.variations)

        await self.db.commit()
        updated = await self.get_product_or_404(product_id)
        return self.product_to_read(updated)

    async def list_products(
        self,
        *,
        name: str | None,
        category_id: int | None,
    ) -> list[ProductRead]:
        query = (
            select(Product)
            .options(
                selectinload(Product.variations),
                selectinload(Product.category_links),
                selectinload(Product.images),
            )
            .where(Product.tenant_id == self.tenant_context.tenant_id)
            .order_by(Product.name.asc())
        )
        if name is not None and name.strip():
            query = query.where(Product.name.ilike(f"%{name.strip()}%"))
        if category_id is not None:
            query = query.where(
                Product.category_links.any(ProductCategory.category_id == category_id)
            )

        result = await self.db.execute(query)
        products = list(result.scalars().all())
        return [self.product_to_read(product) for product in products]

    async def delete_product(self, product_id: int) -> None:
        product = await self.get_product_or_404(product_id)
        for image in list(product.images):
            delete_upload_file_if_safe(image.url)
        await self.db.delete(product)
        await self.db.commit()

    async def image_row_count(self, product_id: int) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(ProductImage)
            .where(
                ProductImage.product_id == product_id,
                ProductImage.tenant_id == self.tenant_context.tenant_id,
            )
        )
        return int(result.scalar_one() or 0)

    async def persist_legacy_image_row_if_needed(self, product: Product) -> None:
        if not product.image_url:
            return
        if await self.image_row_count(product.id) > 0:
            return
        self.db.add(
            ProductImage(
                tenant_id=self.tenant_context.tenant_id,
                product_id=product.id,
                url=product.image_url,
                sort_order=0,
            )
        )
        await self.db.flush()

    async def sync_product_primary_image_url(self, product_id: int) -> None:
        product = await self.get_product_or_404(product_id)
        first = await self.db.execute(
            select(ProductImage.url)
            .where(
                ProductImage.product_id == product_id,
                ProductImage.tenant_id == self.tenant_context.tenant_id,
            )
            .order_by(ProductImage.sort_order.asc())
            .limit(1)
        )
        product.image_url = first.scalar_one_or_none()
        await self.db.commit()

    async def upload_product_file(self, product_id: int, file: UploadFile) -> str:
        product = await self.get_product_or_404(product_id)

        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Falta o nome do arquivo no envio.",
            )

        await self.persist_legacy_image_row_if_needed(product)
        next_index = await self.image_row_count(product.id)
        if next_index >= MAX_IMAGES_PER_PRODUCT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No máximo {MAX_IMAGES_PER_PRODUCT} imagens por produto.",
            )

        extension = Path(file.filename).suffix
        filename = f"{uuid.uuid4().hex}{extension}"
        destination = UPLOAD_DIR / filename
        file_bytes = await file.read()
        destination.write_bytes(file_bytes)

        file_url = f"/uploads/products/{filename}"
        self.db.add(
            ProductImage(
                tenant_id=self.tenant_context.tenant_id,
                product_id=product.id,
                url=file_url,
                sort_order=next_index,
            )
        )
        await self.db.commit()
        await self.sync_product_primary_image_url(product_id)
        return file_url

    async def delete_product_image(self, product_id: int, image_id: int) -> None:
        await self.get_product_or_404(product_id)
        result = await self.db.execute(
            select(ProductImage).where(
                ProductImage.id == image_id,
                ProductImage.product_id == product_id,
                ProductImage.tenant_id == self.tenant_context.tenant_id,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Imagem não encontrada."
            )
        url = row.url
        await self.db.delete(row)
        await self.db.commit()
        delete_upload_file_if_safe(url)
        await self.sync_product_primary_image_url(product_id)

    async def reorder_product_images(
        self,
        product_id: int,
        requested_ids: list[int],
    ) -> ProductRead:
        product = await self.get_product_or_404(product_id)
        current_ids = [
            img.id for img in sorted(product.images, key=lambda x: x.sort_order)
        ]
        if set(requested_ids) != set(current_ids) or len(requested_ids) != len(
            current_ids
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova ordem deve conter exatamente as imagens atuais do produto.",
            )

        by_id = {img.id: img for img in product.images}
        offset = len(requested_ids)
        for index, image_id in enumerate(requested_ids):
            by_id[image_id].sort_order = index + offset

        await self.db.flush()

        for index, image_id in enumerate(requested_ids):
            by_id[image_id].sort_order = index

        await self.db.commit()
        await self.sync_product_primary_image_url(product_id)
        updated = await self.get_product_or_404(product_id)
        return self.product_to_read(updated)


def get_products_service(
    db: AsyncSession = Depends(get_db),
    tenant_context: TenantContext = Depends(get_tenant_context),
) -> ProductsService:
    return ProductsService(db=db, tenant_context=tenant_context)
