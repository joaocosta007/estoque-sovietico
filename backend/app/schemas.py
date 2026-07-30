from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from .models import PaymentMethod


class SaleItemInput(BaseModel):
    product_id: str
    quantity: Decimal = Field(gt=0, decimal_places=3)
    unit_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)


class PaymentInput(BaseModel):
    method: PaymentMethod
    amount: Decimal = Field(gt=0, decimal_places=2)
    installments: int = Field(default=1, ge=1, le=24)
    due_days: int = Field(default=30, ge=0, le=365)


class SaleCreate(BaseModel):
    customer_id: str | None = None
    discount: Decimal = Field(default=Decimal(0), ge=0, decimal_places=2)
    items: list[SaleItemInput] = Field(min_length=1)
    payments: list[PaymentInput] = Field(min_length=1)

    @model_validator(mode="after")
    def credit_requires_customer(self) -> "SaleCreate":
        if any(p.method == PaymentMethod.CREDIT for p in self.payments) and not self.customer_id:
            raise ValueError("Venda fiada exige cliente")
        return self


class SaleResult(BaseModel):
    id: str
    total: Decimal
    status: str
    created_at: datetime
