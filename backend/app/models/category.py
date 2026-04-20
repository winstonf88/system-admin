from __future__ import annotations

from sqlalchemy import ForeignKeyConstraint, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("id", "tenant_id", name="uq_categories_id_tenant"),
        UniqueConstraint(
            "tenant_id", "name", "parent_id", name="uq_category_tenant_name_parent"
        ),
        ForeignKeyConstraint(
            ["tenant_id"], ["tenants.id"], name="fk_categories_tenant_id"
        ),
        ForeignKeyConstraint(
            ["parent_id", "tenant_id"],
            ["categories.id", "categories.tenant_id"],
            name="fk_categories_parent_same_tenant",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    sort_order: Mapped[int] = mapped_column(nullable=False, default=0)

    parent: Mapped[Category | None] = relationship(
        "Category",
        remote_side=[id, tenant_id],
        back_populates="subcategories",
    )
    subcategories: Mapped[list[Category]] = relationship(
        "Category",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    product_links: Mapped[list["ProductCategory"]] = relationship(
        "ProductCategory",
        back_populates="category",
        cascade="all, delete-orphan",
        overlaps="category_links,product",
    )
