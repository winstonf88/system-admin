from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_utils.cbv import cbv
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import TenantContext, get_db, get_tenant_context
from app.models import Tenant
from app.models.tenant_config import TenantConfig
from app.schemas import TenantRead, TenantUpdate

router = APIRouter(prefix="/api/tenant", tags=["tenant"])


@cbv(router)
class TenantView:
    db: AsyncSession = Depends(get_db)
    tenant_context: TenantContext = Depends(get_tenant_context)

    async def _get_tenant(self) -> Tenant:
        tenant = await self.db.get(Tenant, self.tenant_context.tenant_id)
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
            tenant.config = payload.config if payload.config is not None else TenantConfig()

        await self.db.commit()
        await self.db.refresh(tenant)
        return tenant
