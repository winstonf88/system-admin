from fastapi import Depends, HTTPException, status

from app.dependencies import TenantContext, get_tenant_context
from app.models import User


class UsersService:
    def __init__(self, tenant_context: TenantContext) -> None:
        self.tenant_context = tenant_context
        self.queryset = User.filter(tenant_id=tenant_context.tenant_id)

    async def get_user_or_404(self, user_id: int) -> User:
        user = await self.queryset.get_or_none(id=user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado."
            )
        return user

    async def ensure_email_available(
        self, email: str, exclude_user_id: int | None = None
    ) -> None:
        q = User.filter(email=email)
        if exclude_user_id is not None:
            q = q.exclude(id=exclude_user_id)
        if await q.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um usuário com este e-mail.",
            )


def get_users_service(
    tenant_context: TenantContext = Depends(get_tenant_context),
) -> UsersService:
    return UsersService(tenant_context=tenant_context)
