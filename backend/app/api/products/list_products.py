from dataclasses import dataclass

from fastapi import APIRouter, Depends, Query

from app.api.products.service import ProductsService, get_products_service
from app.schemas import ProductListResponse

router = APIRouter()


@dataclass
class ProductParams:
    name: str | None = Query(default=None, min_length=1)
    category_id: int | None = Query(default=None, ge=1)
    is_active: bool | None = Query(default=None)
    page: int = Query(default=1, ge=1)
    count: int = Query(default=20, ge=1, le=100)


@router.get("/", response_model=ProductListResponse)
async def list_products(
    params: ProductParams = Depends(),
    service: ProductsService = Depends(get_products_service),
) -> ProductListResponse:
    return await service.list_products(
        name=params.name,
        category_id=params.category_id,
        is_active=params.is_active,
        page=params.page,
        count=params.count,
    )
