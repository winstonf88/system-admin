from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPBasic, HTTPBasicCredentials

from app.core.auth import _authenticate_user
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
) -> TenantContext:
    if api_key is not None:
        hashed = hash_api_key(api_key)
        tenant = await Tenant.filter(api_key_hash=hashed).only("id", "is_active").first()
        if tenant is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chave de API inválida.",
            )
        if not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A organização está desativada.",
            )
        return TenantContext(tenant_id=tenant.id)

    if credentials is not None:
        user = await _authenticate_user(credentials)
        return TenantContext(tenant_id=(await user.tenant).id)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Basic"},
    )
