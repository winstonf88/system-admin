"""Shared FastAPI dependencies (single import surface; implementations live in `app.core`)."""

from fastapi import Request

from app.core.auth import get_current_user
from app.core.storage import StorageBackend
from app.core.tenant import TenantContext, get_tenant_context


def get_storage(request: Request) -> StorageBackend:
    return request.app.state.storage


__all__ = [
    "TenantContext",
    "StorageBackend",
    "get_current_user",
    "get_storage",
    "get_tenant_context",
]
