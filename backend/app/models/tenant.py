from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.pydantic_json import PydanticJSON
from app.models.tenant_config import TenantConfig

if TYPE_CHECKING:
    from app.models.user import User


def _default_tenant_config() -> TenantConfig:
    return TenantConfig()


_tenant_config_json = PydanticJSON(TenantConfig, coerce_null_to_empty=True)


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(
        String(80), nullable=False, unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    config: Mapped[TenantConfig] = mapped_column(
        _tenant_config_json,
        nullable=False,
        default=_default_tenant_config,
    )

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
