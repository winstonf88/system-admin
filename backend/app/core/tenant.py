from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPBasic, HTTPBasicCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import _authenticate_user
from app.core.database import get_db
from app.core.security import hash_api_key
from app.models import Tenant

_api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)
_http_basic = HTTPBasic(auto_error=False)


@dataclass(frozen=True)
class TenantContext:
    tenant_id: int


async def get_tenant_context(
    api_key: str | None = Depends(_api_key_header),
    credentials: HTTPBasicCredentials | None = Depends(_http_basic),
    db: AsyncSession = Depends(get_db),
) -> TenantContext:
    if api_key is not None:
        hashed = hash_api_key(api_key)
        result = await db.execute(
            select(Tenant.id, Tenant.is_active)
            .where(Tenant.api_key_hash == hashed)
            .limit(1)
        )
        row = result.first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chave de API inválida.",
            )
        tenant_id, is_active = row
        if not is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A organização está desativada.",
            )
        return TenantContext(tenant_id=tenant_id)

    if credentials is not None:
        user = await _authenticate_user(credentials, db)
        return TenantContext(tenant_id=user.tenant_id)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Basic"},
    )
