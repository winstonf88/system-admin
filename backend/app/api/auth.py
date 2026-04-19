from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.tenant import TenantContext, get_tenant_context
from app.models import User
from app.schemas import AuthSessionRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/session", response_model=AuthSessionRead)
async def auth_session(
    user: User = Depends(get_current_user),
    _: TenantContext = Depends(get_tenant_context),
) -> AuthSessionRead:
    return AuthSessionRead(email=user.email, tenant_id=user.tenant_id)
