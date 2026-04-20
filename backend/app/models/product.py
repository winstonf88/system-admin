from __future__ import annotations

from sqlalchemy import ForeignKey, ForeignKeyConstraint, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ProductImage(Base):
    __tablename__ = "product_images"
    __table_args__ = (
        ForeignKeyConstraint(
            ["product_id", "tenant_id"],
            ["products.id", "products.tenant_id"],
            name="fk_product_images_product",
        ),
        UniqueConstraint("product_id", "tenant_id", "sort_order", name="uq_product_images_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    sort_order: Mapped[int] = mapped_column(nullable=False, default=0)

    product: Mapped["Product"] = relationship("Product", back_populates="images")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("id", "tenant_id", name="uq_products_id_tenant"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="fk_products_tenant_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    category_links: Mapped[list["ProductCategory"]] = relationship(
        "ProductCategory",
        back_populates="product",
        cascade="all, delete-orphan",
        overlaps="product_links,category",
    )
    variations: Mapped[list["ProductVariation"]] = relationship(
        "ProductVariation",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )


class ProductCategory(Base):
    __tablename__ = "product_categories"
    __table_args__ = (
        UniqueConstraint("product_id", "category_id", name="uq_product_categories_pair"),
        ForeignKeyConstraint(
            ["product_id", "tenant_id"],
            ["products.id", "products.tenant_id"],
            name="fk_product_categories_product",
        ),
        ForeignKeyConstraint(
            ["category_id", "tenant_id"],
            ["categories.id", "categories.tenant_id"],
            name="fk_product_categories_category",
        ),
    )

    product_id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(nullable=False, index=True)

    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="category_links",
        overlaps="product_links,category",
    )
    category: Mapped["Category"] = relationship(
        "Category",
        back_populates="product_links",
        overlaps="category_links,product",
    )


class ProductVariation(Base):
    __tablename__ = "product_variations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    size: Mapped[str | None] = mapped_column(String(64), nullable=True)
    color: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quantity: Mapped[int] = mapped_column(default=0)

    product: Mapped[Product] = relationship("Product", back_populates="variations")
