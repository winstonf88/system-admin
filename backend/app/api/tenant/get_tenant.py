from fastapi import APIRouter, Depends

from app.models import Tenant
from app.api.tenant.service import TenantService, get_tenant_service
from app.schemas import TenantRead

router = APIRouter()


@router.get("/", response_model=TenantRead)
async def get_tenant(service: TenantService = Depends(get_tenant_service)) -> Tenant:
    return await service.get_tenant()
