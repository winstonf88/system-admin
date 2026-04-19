from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Tenant, User


@dataclass(frozen=True)
class TenantContext:
    tenant_id: int


async def get_tenant_context(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TenantContext:
    tenant_exists = await db.scalar(select(Tenant.id).where(Tenant.id == user.tenant_id).limit(1))
    if not tenant_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found.")

    return TenantContext(tenant_id=user.tenant_id)
