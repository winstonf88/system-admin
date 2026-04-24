from fastapi import APIRouter, Depends, status

from app.api.products.service import ProductsService, get_products_service

router = APIRouter()


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    service: ProductsService = Depends(get_products_service),
) -> None:
    await service.delete_product(product_id)
