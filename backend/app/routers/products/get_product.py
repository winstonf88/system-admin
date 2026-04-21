from fastapi import APIRouter, Depends

from app.routers.products.common import ProductsService, get_products_service
from app.schemas import ProductRead

router = APIRouter()


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: int,
    service: ProductsService = Depends(get_products_service),
) -> ProductRead:
    product = await service.get_product_or_404(product_id)
    return service.product_to_read(product)
