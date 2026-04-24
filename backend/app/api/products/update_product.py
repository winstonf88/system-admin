from fastapi import APIRouter, Depends

from app.api.products.service import ProductsService, get_products_service
from app.schemas import ProductRead, ProductUpdate

router = APIRouter()


@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    service: ProductsService = Depends(get_products_service),
) -> ProductRead:
    return await service.update_product(product_id=product_id, payload=payload)
