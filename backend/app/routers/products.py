import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi_utils.cbv import cbv
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import TenantContext, get_db, get_tenant_context
from app.models import Category, Product, ProductCategory, ProductImage, ProductVariation
from app.schemas import (
    ProductCreate,
    ProductImageOrderUpdate,
    ProductImageRead,
    ProductRead,
    ProductUpdate,
    ProductVariationRead,
    UploadResponse,
)

UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGES_PER_PRODUCT = 10

router = APIRouter(prefix="/api/products", tags=["products"])


def _delete_upload_file_if_safe(url: str) -> None:
    if not url.startswith("/uploads/products/"):
        return
    relative = url.removeprefix("/uploads/")
    path = Path("uploads") / relative
    if path.is_file():
        path.unlink()


@cbv(router)
class ProductView:
    db: AsyncSession = Depends(get_db)
    tenant_context: TenantContext = Depends(get_tenant_context)

    def _product_to_read(self, product: Product) -> ProductRead:
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
            variations=[ProductVariationRead.model_validate(v) for v in product.variations],
        )

    async def _get_product_or_404(self, product_id: int) -> Product:
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
        return product

    async def _validate_categories(self, category_ids: list[int]) -> None:
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    def _replace_variations(self, product: Product, payload_variations: list) -> None:
        product.variations.clear()
        for variation in payload_variations:
            product.variations.append(
                ProductVariation(size=variation.size, color=variation.color, quantity=variation.quantity)
            )

    @router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
    async def create_product(self, payload: ProductCreate) -> ProductRead:
        await self._validate_categories(payload.category_ids)

        product = Product(
            tenant_id=self.tenant_context.tenant_id,
            name=payload.name,
            description=payload.description,
            image_url=payload.image_url,
        )
        for cid in payload.category_ids:
            product.category_links.append(
                ProductCategory(
                    tenant_id=self.tenant_context.tenant_id,
                    category_id=cid,
                )
            )

        for variation in payload.variations:
            product.variations.append(
                ProductVariation(size=variation.size, color=variation.color, quantity=variation.quantity)
            )

        self.db.add(product)
        await self.db.commit()
        created = await self._get_product_or_404(product.id)
        return self._product_to_read(created)

    @router.get("/", response_model=list[ProductRead])
    async def list_products(self) -> list[ProductRead]:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.variations),
                selectinload(Product.category_links),
                selectinload(Product.images),
            )
            .where(Product.tenant_id == self.tenant_context.tenant_id)
            .order_by(Product.name.asc())
        )
        products = list(result.scalars().all())
        return [self._product_to_read(p) for p in products]

    @router.get("/{product_id}", response_model=ProductRead)
    async def get_product(self, product_id: int) -> ProductRead:
        product = await self._get_product_or_404(product_id)
        return self._product_to_read(product)

    @router.put("/{product_id}", response_model=ProductRead)
    async def update_product(
        self,
        product_id: int,
        payload: ProductUpdate,
    ) -> ProductRead:
        product = await self._get_product_or_404(product_id)

        if "category_ids" in payload.model_fields_set and payload.category_ids is not None:
            await self._validate_categories(payload.category_ids)
            product.category_links.clear()
            for cid in payload.category_ids:
                product.category_links.append(
                    ProductCategory(
                        tenant_id=self.tenant_context.tenant_id,
                        category_id=cid,
                    )
                )

        if "name" in payload.model_fields_set and payload.name is not None:
            product.name = payload.name

        if "description" in payload.model_fields_set:
            product.description = payload.description

        if "image_url" in payload.model_fields_set:
            product.image_url = payload.image_url

        if "variations" in payload.model_fields_set and payload.variations is not None:
            self._replace_variations(product, payload.variations)

        await self.db.commit()
        updated = await self._get_product_or_404(product_id)
        return self._product_to_read(updated)

    @router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_product(self, product_id: int) -> None:
        product = await self._get_product_or_404(product_id)
        for img in list(product.images):
            _delete_upload_file_if_safe(img.url)
        await self.db.delete(product)
        await self.db.commit()

    async def _image_row_count(self, product_id: int) -> int:
        r = await self.db.execute(
            select(func.count())
            .select_from(ProductImage)
            .where(
                ProductImage.product_id == product_id,
                ProductImage.tenant_id == self.tenant_context.tenant_id,
            )
        )
        return int(r.scalar_one() or 0)

    async def _persist_legacy_image_row_if_needed(self, product: Product) -> None:
        if not product.image_url:
            return
        if await self._image_row_count(product.id) > 0:
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

    async def _sync_product_primary_image_url(self, product_id: int) -> None:
        product = await self._get_product_or_404(product_id)
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

    @router.post("/{product_id}/upload", response_model=UploadResponse)
    async def upload_product_file(
        self,
        product_id: int,
        file: UploadFile = File(...),
    ) -> UploadResponse:
        product = await self._get_product_or_404(product_id)

        if not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falta o nome do arquivo no envio.")

        await self._persist_legacy_image_row_if_needed(product)
        next_index = await self._image_row_count(product.id)
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
        await self._sync_product_primary_image_url(product_id)

        return UploadResponse(file_url=file_url)

    @router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_product_image(self, product_id: int, image_id: int) -> None:
        await self._get_product_or_404(product_id)
        result = await self.db.execute(
            select(ProductImage).where(
                ProductImage.id == image_id,
                ProductImage.product_id == product_id,
                ProductImage.tenant_id == self.tenant_context.tenant_id,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagem não encontrada.")
        url = row.url
        await self.db.delete(row)
        await self.db.commit()
        _delete_upload_file_if_safe(url)
        await self._sync_product_primary_image_url(product_id)

    @router.put("/{product_id}/images/order", response_model=ProductRead)
    async def reorder_product_images(
        self,
        product_id: int,
        payload: ProductImageOrderUpdate,
    ) -> ProductRead:
        product = await self._get_product_or_404(product_id)
        current_ids = [img.id for img in sorted(product.images, key=lambda x: x.sort_order)]
        requested_ids = payload.image_ids
        if set(requested_ids) != set(current_ids) or len(requested_ids) != len(current_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova ordem deve conter exatamente as imagens atuais do produto.",
            )

        by_id = {img.id: img for img in product.images}
        offset = len(requested_ids)
        for idx, image_id in enumerate(requested_ids):
            by_id[image_id].sort_order = idx + offset

        await self.db.flush()

        for idx, image_id in enumerate(requested_ids):
            by_id[image_id].sort_order = idx

        await self.db.commit()
        await self._sync_product_primary_image_url(product_id)
        updated = await self._get_product_or_404(product_id)
        return self._product_to_read(updated)
