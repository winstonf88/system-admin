from fastapi import APIRouter, Depends, File, UploadFile

from app.api.products.service import ProductsService, get_products_service
from app.schemas import UploadResponse

router = APIRouter()


@router.post("/{product_id}/upload", response_model=UploadResponse)
async def upload_product_file(
    product_id: int,
    file: UploadFile = File(...),
    service: ProductsService = Depends(get_products_service),
) -> UploadResponse:
    file_url = await service.upload_product_file(product_id=product_id, file=file)
    return UploadResponse(file_url=file_url)
