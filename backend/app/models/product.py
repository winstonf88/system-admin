from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False, index=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    category: Mapped["Category"] = relationship("Category", back_populates="products")
    variations: Mapped[list["ProductVariation"]] = relationship(
        "ProductVariation",
        back_populates="product",
        cascade="all, delete-orphan",
    )


class ProductVariation(Base):
    __tablename__ = "product_variations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    size: Mapped[str | None] = mapped_column(String(64), nullable=True)
    color: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quantity: Mapped[int] = mapped_column(default=0)

    product: Mapped[Product] = relationship("Product", back_populates="variations")
