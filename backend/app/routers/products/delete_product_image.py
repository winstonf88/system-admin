from fastapi import APIRouter, Depends, status

from app.routers.products.common import ProductsService, get_products_service

router = APIRouter()


@router.delete(
    "/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_product_image(
    product_id: int,
    image_id: int,
    service: ProductsService = Depends(get_products_service),
) -> None:
    await service.delete_product_image(product_id=product_id, image_id=image_id)
