import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi_utils.cbv import cbv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Category, Product, ProductVariation
from app.schemas import ProductCreate, ProductRead, ProductUpdate, UploadResponse

UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/products", tags=["products"])

@cbv(router)
class ProductView:
    db: AsyncSession = Depends(get_db)

    async def _get_product_or_404(self, product_id: int) -> Product:
        result = await self.db.execute(
            select(Product).options(selectinload(Product.variations)).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
        return product

    async def _validate_category(self, category_id: int) -> None:
        category = await self.db.get(Category, category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

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
            select(Product).options(selectinload(Product.variations)).order_by(Product.name.asc())
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
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="category_id cannot be null.")
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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename in upload.")

        extension = Path(file.filename).suffix
        filename = f"{uuid.uuid4().hex}{extension}"
        destination = UPLOAD_DIR / filename
        file_bytes = await file.read()
        destination.write_bytes(file_bytes)

        file_url = f"/uploads/products/{filename}"
        product.image_url = file_url
        await self.db.commit()

        return UploadResponse(file_url=file_url)
