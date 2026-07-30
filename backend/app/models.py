from datetime import UTC, date, datetime
from decimal import Decimal
from enum import Enum
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SqlEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def uid() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC)


class ProductKind(str, Enum):
    STOCK = "stock"
    KIT = "kit"


class SaleStatus(str, Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CASH = "cash"
    PIX = "pix"
    CARD = "card"
    CREDIT = "credit"


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("organization_id", "email"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    email: Mapped[str] = mapped_column(String(254))
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("organization_id", "document"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    name: Mapped[str] = mapped_column(String(120))
    document: Mapped[str | None] = mapped_column(String(32), nullable=True)
    credit_limit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("organization_id", "sku"),
        UniqueConstraint("organization_id", "barcode"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    sku: Mapped[str] = mapped_column(String(64))
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[ProductKind] = mapped_column(SqlEnum(ProductKind), default=ProductKind.STOCK)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    min_stock: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class KitComponent(Base):
    __tablename__ = "kit_components"
    __table_args__ = (UniqueConstraint("kit_product_id", "component_product_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    kit_product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    component_product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))


class StockBatch(Base):
    __tablename__ = "stock_batches"
    __table_args__ = (
        Index("ix_stock_batch_fifo", "organization_id", "product_id", "expires_at", "received_at"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    lot_code: Mapped[str] = mapped_column(String(80))
    quantity_available: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    expires_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Sale(Base):
    __tablename__ = "sales"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    customer_id: Mapped[str | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    operator_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[SaleStatus] = mapped_column(SqlEnum(SaleStatus), default=SaleStatus.COMPLETED)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    discount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    sale_id: Mapped[str] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"))
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    sale: Mapped[Sale] = relationship(back_populates="items")


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("ix_stock_movement_history", "organization_id", "product_id", "created_at"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    batch_id: Mapped[str | None] = mapped_column(ForeignKey("stock_batches.id"), nullable=True)
    sale_id: Mapped[str | None] = mapped_column(ForeignKey("sales.id"), nullable=True)
    operator_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    movement_type: Mapped[str] = mapped_column(String(24))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    sale_id: Mapped[str] = mapped_column(ForeignKey("sales.id"))
    method: Mapped[PaymentMethod] = mapped_column(SqlEnum(PaymentMethod))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    installments: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CashEntry(Base):
    __tablename__ = "cash_entries"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    sale_id: Mapped[str | None] = mapped_column(ForeignKey("sales.id"), nullable=True)
    operator_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    entry_type: Mapped[str] = mapped_column(String(16))
    description: Mapped[str] = mapped_column(String(180))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Receivable(Base):
    __tablename__ = "receivables"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"))
    sale_id: Mapped[str] = mapped_column(ForeignKey("sales.id"))
    original_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    open_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    due_date: Mapped[date]
    status: Mapped[str] = mapped_column(String(16), default="open")
