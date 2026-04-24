import uuid
from pathlib import Path

from fastapi import Depends, HTTPException, UploadFile, status

from app.dependencies import TenantContext, get_tenant_context
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


def delete_upload_file_if_safe(url: str) -> None:
    if not url.startswith("/uploads/products/"):
        return
    relative = url.removeprefix("/uploads/")
    path = Path("uploads") / relative
    if path.is_file():
        path.unlink()


class ProductsService:
    def __init__(self, tenant_context: TenantContext) -> None:
        self.tenant_context = tenant_context
        self.queryset = Product.filter(tenant_id=tenant_context.tenant_id)
        self.category_qs = Category.filter(tenant_id=tenant_context.tenant_id)
        self.product_category_qs = ProductCategory.filter(
            tenant_id=tenant_context.tenant_id
        )
        self.image_qs = ProductImage.filter(tenant_id=tenant_context.tenant_id)

    def product_to_read(self, product: Product) -> ProductRead:
        category_ids = sorted({link.category_id for link in product.category_links})
        sorted_imgs = sorted(product.images, key=lambda x: x.sort_order)
        image_reads = [ProductImageRead.model_validate(i) for i in sorted_imgs]
        primary_url = image_reads[0].url if image_reads else product.image_url
        return ProductRead(
            id=product.id,
            name=product.name,
            price=product.price,
            description=product.description,
            image_url=primary_url,
            is_active=product.is_active,
            images=image_reads,
            category_ids=category_ids,
            variations=[
                ProductVariationRead.model_validate(v) for v in product.variations
            ],
        )

    async def _fetch_with_relations(self, product_id: int) -> Product | None:
        return await (
            self.queryset.filter(id=product_id)
            .prefetch_related("category_links", "variations", "images")
            .first()
        )

    async def get_product_or_404(self, product_id: int) -> Product:
        product = await self._fetch_with_relations(product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado."
            )
        return product

    async def validate_categories(self, category_ids: list[int]) -> None:
        if not category_ids:
            return
        found = await self.category_qs.filter(
            id__in=category_ids,
        ).values_list("id", flat=True)
        missing = set(category_ids) - set(found)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada.",
            )

    async def list_tenant_categories(self) -> list[Category]:
        return await self.category_qs.order_by("parent_id", "sort_order", "name", "id")

    async def _replace_variations(
        self,
        product: Product,
        payload_variations: list[ProductVariationCreate],
    ) -> None:
        await ProductVariation.filter(product_id=product.id).delete()
        for variation in payload_variations:
            await ProductVariation.create(
                product_id=product.id,
                size=variation.size,
                color=variation.color,
                quantity=variation.quantity,
            )

    async def create_product(self, payload: ProductCreate) -> ProductRead:
        await self.validate_categories(payload.category_ids)

        product = await Product.create(
            tenant_id=self.tenant_context.tenant_id,
            name=payload.name,
            price=payload.price,
            description=payload.description,
            image_url=payload.image_url,
        )
        for category_id in payload.category_ids:
            await ProductCategory.create(
                product_id=product.id,
                tenant_id=self.tenant_context.tenant_id,
                category_id=category_id,
            )
        for variation in payload.variations:
            await ProductVariation.create(
                product_id=product.id,
                size=variation.size,
                color=variation.color,
                quantity=variation.quantity,
            )

        created = await self.get_product_or_404(product.id)
        return self.product_to_read(created)

    async def update_product(
        self, product_id: int, payload: ProductUpdate
    ) -> ProductRead:
        product = await self.get_product_or_404(product_id)
        update_fields: list[str] = []

        if (
            "category_ids" in payload.model_fields_set
            and payload.category_ids is not None
        ):
            await self.validate_categories(payload.category_ids)
            await ProductCategory.filter(product_id=product.id).delete()
            for category_id in payload.category_ids:
                await ProductCategory.create(
                    product_id=product.id,
                    tenant_id=self.tenant_context.tenant_id,
                    category_id=category_id,
                )

        if "name" in payload.model_fields_set and payload.name is not None:
            product.name = payload.name
            update_fields.append("name")

        if "price" in payload.model_fields_set and payload.price is not None:
            product.price = payload.price
            update_fields.append("price")

        if "description" in payload.model_fields_set:
            product.description = payload.description
            update_fields.append("description")

        if "image_url" in payload.model_fields_set:
            product.image_url = payload.image_url
            update_fields.append("image_url")

        if "variations" in payload.model_fields_set and payload.variations is not None:
            await self._replace_variations(product, payload.variations)

        if payload.is_active is not None:
            product.is_active = payload.is_active
            update_fields.append("is_active")

        if update_fields:
            await product.save(update_fields=update_fields)

        updated = await self.get_product_or_404(product_id)
        return self.product_to_read(updated)

    async def _collect_category_ids(self, root_id: int) -> list[int]:
        all_categories = await self.category_qs.values("id", "parent_id")
        children: dict[int, list[int]] = {}
        for cat in all_categories:
            parent = cat["parent_id"]
            if parent is not None:
                children.setdefault(parent, []).append(cat["id"])
        result: list[int] = []
        queue = [root_id]
        while queue:
            current = queue.pop()
            result.append(current)
            queue.extend(children.get(current, []))
        return result

    async def list_products(
        self,
        *,
        name: str | None,
        category_id: int | None,
        is_active: bool | None,
    ) -> list[ProductRead]:
        qs = self.queryset.prefetch_related(
            "variations", "category_links", "images"
        ).order_by("name")
        if name is not None and name.strip():
            qs = qs.filter(name__icontains=name.strip())
        if category_id is not None:
            category_ids = await self._collect_category_ids(category_id)
            matching_ids = await self.product_category_qs.filter(
                category_id__in=category_ids,
            ).values_list("product_id", flat=True)
            qs = qs.filter(id__in=list(matching_ids))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        products = await qs
        return [self.product_to_read(product) for product in products]

    async def delete_product(self, product_id: int) -> None:
        product = await self.get_product_or_404(product_id)
        for image in list(product.images):
            delete_upload_file_if_safe(image.url)
        await product.delete()

    def _image_qs(self, product_id: int):
        return self.image_qs.filter(product_id=product_id)

    async def image_row_count(self, product_id: int) -> int:
        return await self._image_qs(product_id).count()

    async def persist_legacy_image_row_if_needed(self, product: Product) -> None:
        if not product.image_url:
            return
        if await self.image_row_count(product.id) > 0:
            return
        await ProductImage.create(
            tenant_id=self.tenant_context.tenant_id,
            product_id=product.id,
            url=product.image_url,
            sort_order=0,
        )

    async def sync_product_primary_image_url(self, product_id: int) -> None:
        first_image = await self._image_qs(product_id).order_by("sort_order").first()
        new_url = first_image.url if first_image else None
        await Product.filter(id=product_id).update(image_url=new_url)

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
        await ProductImage.create(
            tenant_id=self.tenant_context.tenant_id,
            product_id=product.id,
            url=file_url,
            sort_order=next_index,
        )
        await self.sync_product_primary_image_url(product_id)
        return file_url

    async def delete_product_image(self, product_id: int, image_id: int) -> None:
        await self.get_product_or_404(product_id)
        row = await self._image_qs(product_id).get_or_none(id=image_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Imagem não encontrada."
            )
        url = row.url
        await row.delete()
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
        # Two-phase update to avoid unique constraint conflicts on sort_order
        for index, image_id in enumerate(requested_ids):
            by_id[image_id].sort_order = index + offset
            await by_id[image_id].save(update_fields=["sort_order"])

        for index, image_id in enumerate(requested_ids):
            by_id[image_id].sort_order = index
            await by_id[image_id].save(update_fields=["sort_order"])

        await self.sync_product_primary_image_url(product_id)
        updated = await self.get_product_or_404(product_id)
        return self.product_to_read(updated)


def get_products_service(
    tenant_context: TenantContext = Depends(get_tenant_context),
) -> ProductsService:
    return ProductsService(tenant_context=tenant_context)
