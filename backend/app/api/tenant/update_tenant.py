from fastapi import APIRouter, Depends

from app.models import Tenant
from app.models.tenant_config import TenantConfig
from app.api.tenant.service import TenantService, get_tenant_service
from app.schemas import TenantRead, TenantUpdate

router = APIRouter()


@router.patch("/", response_model=TenantRead)
async def update_tenant(
    payload: TenantUpdate,
    service: TenantService = Depends(get_tenant_service),
) -> Tenant:
    tenant = await service.get_tenant()

    if "name" in payload.model_fields_set and payload.name is not None:
        tenant.name = payload.name.strip()

    if "config" in payload.model_fields_set:
        config = payload.config if payload.config is not None else TenantConfig()
        tenant.set_config(config)

    await tenant.save()
    return tenant
