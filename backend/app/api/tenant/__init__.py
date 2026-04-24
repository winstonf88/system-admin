from fastapi import APIRouter

from app.api.tenant.get_tenant import router as get_tenant_router
from app.api.tenant.update_tenant import router as update_tenant_router

router = APIRouter(prefix="/api/tenant", tags=["tenant"])
router.include_router(get_tenant_router)
router.include_router(update_tenant_router)

__all__ = ["router"]
