from fastapi import APIRouter, Depends

from app.api.products.service import ProductsService, get_products_service
from app.schemas import ProductImageOrderUpdate, ProductRead

router = APIRouter()


@router.put("/{product_id}/images/order", response_model=ProductRead)
async def reorder_product_images(
    product_id: int,
    payload: ProductImageOrderUpdate,
    service: ProductsService = Depends(get_products_service),
) -> ProductRead:
    return await service.reorder_product_images(
        product_id=product_id,
        requested_ids=payload.image_ids,
    )
