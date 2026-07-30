from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.database import Base
from app.models import (
    CashEntry,
    KitComponent,
    Organization,
    Product,
    ProductKind,
    StockBatch,
    StockMovement,
    User,
)
from app.schemas import PaymentInput, SaleCreate, SaleItemInput
from app.services.sales import create_sale


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        yield session


def seed(db: Session) -> tuple[Organization, User, Product, StockBatch]:
    org = Organization(name="Loja Teste")
    db.add(org)
    db.flush()
    user = User(
        organization_id=org.id,
        email="operador@example.com",
        name="Operador",
        password_hash="not-used-in-test",
    )
    input_product = Product(
        organization_id=org.id,
        sku="CAF-001",
        name="Café",
        sale_price=Decimal(10),
    )
    kit = Product(
        organization_id=org.id,
        sku="KIT-001",
        name="Kit café",
        kind=ProductKind.KIT,
        sale_price=Decimal(25),
    )
    db.add_all([user, input_product, kit])
    db.flush()
    db.add(KitComponent(kit_product_id=kit.id, component_product_id=input_product.id, quantity=2))
    batch = StockBatch(
        organization_id=org.id,
        product_id=input_product.id,
        lot_code="L001",
        quantity_available=Decimal(10),
        unit_cost=Decimal(4),
    )
    db.add(batch)
    db.commit()
    return org, user, kit, batch


def test_kit_sale_updates_stock_and_cash_atomically(db: Session) -> None:
    org, user, kit, batch = seed(db)
    payload = SaleCreate(
        items=[SaleItemInput(product_id=kit.id, quantity=2)],
        payments=[PaymentInput(method="pix", amount=Decimal(50))],
    )

    sale = create_sale(db, org.id, user.id, payload)

    db.refresh(batch)
    assert batch.quantity_available == Decimal("6.000")
    assert sale.total == Decimal("50.00")
    assert db.scalar(select(func.count()).select_from(StockMovement)) == 1
    assert db.scalar(select(func.count()).select_from(CashEntry)) == 1


def test_insufficient_stock_rolls_back_everything(db: Session) -> None:
    org, user, kit, batch = seed(db)
    payload = SaleCreate(
        items=[SaleItemInput(product_id=kit.id, quantity=6)],
        payments=[PaymentInput(method="cash", amount=Decimal(150))],
    )

    with pytest.raises(HTTPException) as error:
        create_sale(db, org.id, user.id, payload)

    assert error.value.status_code == 409
    db.refresh(batch)
    assert batch.quantity_available == Decimal("10.000")
    assert db.scalar(select(func.count()).select_from(CashEntry)) == 0
