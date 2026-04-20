"""Typed tenant settings stored as JSON (`tenants.config`).

Add optional fields here as your product grows; unknown keys from the DB are kept
(`extra="allow"`) so older rows stay valid.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class TenantConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
