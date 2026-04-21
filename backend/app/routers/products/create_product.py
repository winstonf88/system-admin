from fastapi import APIRouter, Depends, status

from app.routers.products.common import ProductsService, get_products_service
from app.schemas import ProductCreate, ProductRead

router = APIRouter()


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    service: ProductsService = Depends(get_products_service),
) -> ProductRead:
    return await service.create_product(payload)
