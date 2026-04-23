from fastapi import Depends, HTTPException, status

from app.dependencies import TenantContext, get_tenant_context
from app.models import Tenant


class TenantService:
    def __init__(self, tenant_context: TenantContext) -> None:
        self.tenant_context = tenant_context

    async def get_tenant(self) -> Tenant:
        tenant = await Tenant.get_or_none(id=self.tenant_context.tenant_id)
        if tenant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organização não encontrada.",
            )
        return tenant


def get_tenant_service(
    tenant_context: TenantContext = Depends(get_tenant_context),
) -> TenantService:
    return TenantService(tenant_context=tenant_context)
