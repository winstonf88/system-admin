import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi_utils.cbv import cbv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import TenantContext, get_db, get_tenant_context
from app.models import Category, Product, ProductVariation
from app.schemas import ProductCreate, ProductRead, ProductUpdate, UploadResponse

UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/products", tags=["products"])


@cbv(router)
class ProductView:
    db: AsyncSession = Depends(get_db)
    tenant_context: TenantContext = Depends(get_tenant_context)

    async def _get_product_or_404(self, product_id: int) -> Product:
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.variations))
            .where(
                Product.id == product_id,
                Product.tenant_id == self.tenant_context.tenant_id,
            )
        )
        product = result.scalar_one_or_none()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
        return product

    async def _validate_category(self, category_id: int) -> None:
        category = await self.db.scalar(
            select(Category.id)
            .where(
                Category.id == category_id,
                Category.tenant_id == self.tenant_context.tenant_id,
            )
            .limit(1)
        )
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    def _replace_variations(self, product: Product, payload_variations: list) -> None:
        product.variations.clear()
        for variation in payload_variations:
            product.variations.append(
                ProductVariation(size=variation.size, color=variation.color, quantity=variation.quantity)
            )

    @router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
    async def create_product(self, payload: ProductCreate) -> Product:
        await self._validate_category(payload.category_id)

        product = Product(
            tenant_id=self.tenant_context.tenant_id,
            name=payload.name,
            description=payload.description,
            category_id=payload.category_id,
            image_url=payload.image_url,
        )

        for variation in payload.variations:
            product.variations.append(
                ProductVariation(size=variation.size, color=variation.color, quantity=variation.quantity)
            )

        self.db.add(product)
        await self.db.commit()
        return await self._get_product_or_404(product.id)

    @router.get("/", response_model=list[ProductRead])
    async def list_products(self) -> list[Product]:
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.variations))
            .where(Product.tenant_id == self.tenant_context.tenant_id)
            .order_by(Product.name.asc())
        )
        return list(result.scalars().all())

    @router.get("/{product_id}", response_model=ProductRead)
    async def get_product(self, product_id: int) -> Product:
        return await self._get_product_or_404(product_id)

    @router.put("/{product_id}", response_model=ProductRead)
    async def update_product(
        self,
        product_id: int,
        payload: ProductUpdate,
    ) -> Product:
        product = await self._get_product_or_404(product_id)

        if "category_id" in payload.model_fields_set:
            if payload.category_id is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="category_id não pode ser nulo.")
            await self._validate_category(payload.category_id)
            product.category_id = payload.category_id

        if "name" in payload.model_fields_set and payload.name is not None:
            product.name = payload.name

        if "description" in payload.model_fields_set:
            product.description = payload.description

        if "image_url" in payload.model_fields_set:
            product.image_url = payload.image_url

        if "variations" in payload.model_fields_set and payload.variations is not None:
            self._replace_variations(product, payload.variations)

        await self.db.commit()
        return await self._get_product_or_404(product_id)

    @router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_product(self, product_id: int) -> None:
        product = await self._get_product_or_404(product_id)
        await self.db.delete(product)
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

        extension = Path(file.filename).suffix
        filename = f"{uuid.uuid4().hex}{extension}"
        destination = UPLOAD_DIR / filename
        file_bytes = await file.read()
        destination.write_bytes(file_bytes)

        file_url = f"/uploads/products/{filename}"
        product.image_url = file_url
        await self.db.commit()

        return UploadResponse(file_url=file_url)
