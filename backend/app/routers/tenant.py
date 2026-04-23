from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_utils.cbv import cbv

from app.dependencies import TenantContext, get_tenant_context
from app.models import Tenant
from app.models.tenant_config import TenantConfig
from app.schemas import TenantRead, TenantUpdate

router = APIRouter(prefix="/api/tenant", tags=["tenant"])


@cbv(router)
class TenantView:
    tenant_context: TenantContext = Depends(get_tenant_context)

    async def _get_tenant(self) -> Tenant:
        tenant = await Tenant.get_or_none(id=self.tenant_context.tenant_id)
        if tenant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organização não encontrada.",
            )
        return tenant

    @router.get("/", response_model=TenantRead)
    async def get_tenant(self) -> Tenant:
        return await self._get_tenant()

    @router.patch("/", response_model=TenantRead)
    async def update_tenant(self, payload: TenantUpdate) -> Tenant:
        tenant = await self._get_tenant()

        if "name" in payload.model_fields_set and payload.name is not None:
            tenant.name = payload.name.strip()

        if "config" in payload.model_fields_set:
            config = payload.config if payload.config is not None else TenantConfig()
            tenant.set_config(config)

        await tenant.save()
        return tenant
