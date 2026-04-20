"""Shared FastAPI dependencies (single import surface; implementations live in `app.core`)."""

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.tenant import TenantContext, get_tenant_context

__all__ = ["TenantContext", "get_current_user", "get_db", "get_tenant_context"]
