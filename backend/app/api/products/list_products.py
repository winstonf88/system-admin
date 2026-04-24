from fastapi import APIRouter, Depends, Query

from app.api.products.service import ProductsService, get_products_service
from app.schemas import ProductRead

router = APIRouter()


@router.get("/", response_model=list[ProductRead])
async def list_products(
    name: str | None = Query(default=None, min_length=1),
    category_id: int | None = Query(default=None, ge=1),
    is_active: bool | None = Query(default=None),
    service: ProductsService = Depends(get_products_service),
) -> list[ProductRead]:
    return await service.list_products(
        name=name,
        category_id=category_id,
        is_active=is_active,
    )
