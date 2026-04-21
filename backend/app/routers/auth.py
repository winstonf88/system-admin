from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import TenantContext, get_current_user, get_db, get_tenant_context
from app.models import Tenant, User
from app.schemas import AuthSessionRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/session", response_model=AuthSessionRead)
async def auth_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: TenantContext = Depends(get_tenant_context),
) -> AuthSessionRead:
    """Current user from Basic auth. Next.js validates sign-in with GET + Basic (not a browser POST)."""
    tenant = await db.get(Tenant, user.tenant_id)
    assert tenant is not None
    return AuthSessionRead(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        tenant_name=tenant.name,
    )
