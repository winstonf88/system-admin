from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Tenant


@dataclass(frozen=True)
class TenantContext:
    tenant_id: int


def _parse_tenant_id(raw_value: object) -> int | None:
    if raw_value is None:
        return None
    if isinstance(raw_value, int):
        return raw_value
    if isinstance(raw_value, str) and raw_value.strip().isdigit():
        return int(raw_value.strip())
    return None


async def get_tenant_context(request: Request, db: AsyncSession = Depends(get_db)) -> TenantContext:
    raw_tenant_id = getattr(request.state, "tenant_id", None)

    tenant_id = _parse_tenant_id(raw_tenant_id)
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context is missing or invalid.",
        )

    tenant_exists = await db.scalar(select(Tenant.id).where(Tenant.id == tenant_id).limit(1))
    if not tenant_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found.")

    return TenantContext(tenant_id=tenant_id)
