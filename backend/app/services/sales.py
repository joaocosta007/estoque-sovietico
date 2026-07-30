from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    CashEntry,
    Customer,
    KitComponent,
    Payment,
    PaymentMethod,
    Product,
    ProductKind,
    Receivable,
    Sale,
    SaleItem,
    StockBatch,
    StockMovement,
)
from ..schemas import SaleCreate

MONEY = Decimal("0.01")
QTY = Decimal("0.001")


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def _expand_product(
    db: Session,
    organization_id: str,
    product: Product,
    quantity: Decimal,
    path: frozenset[str] = frozenset(),
) -> dict[str, Decimal]:
    if product.id in path:
        raise HTTPException(status_code=409, detail=f"Ciclo detectado no kit {product.name}")
    if product.kind == ProductKind.STOCK:
        return {product.id: quantity}

    components = db.scalars(
        select(KitComponent).where(KitComponent.kit_product_id == product.id)
    ).all()
    if not components:
        raise HTTPException(status_code=409, detail=f"Kit {product.name} não possui insumos")

    expanded: dict[str, Decimal] = defaultdict(Decimal)
    for component in components:
        child = db.scalar(
            select(Product).where(
                Product.id == component.component_product_id,
                Product.organization_id == organization_id,
                Product.active.is_(True),
            )
        )
        if not child:
            raise HTTPException(status_code=409, detail="Insumo inexistente ou inativo")
        child_parts = _expand_product(
            db,
            organization_id,
            child,
            quantity * component.quantity,
            path | {product.id},
        )
        for product_id, required in child_parts.items():
            expanded[product_id] += required
    return dict(expanded)


def create_sale(
    db: Session,
    organization_id: str,
    operator_id: str,
    payload: SaleCreate,
) -> Sale:
    """Persist sale, FIFO stock consumption and finance entries atomically."""
    try:
        products: dict[str, Product] = {}
        required_stock: dict[str, Decimal] = defaultdict(Decimal)
        subtotal = Decimal(0)

        for item in payload.items:
            product = db.scalar(
                select(Product).where(
                    Product.id == item.product_id,
                    Product.organization_id == organization_id,
                    Product.active.is_(True),
                )
            )
            if not product:
                raise HTTPException(
                    status_code=404, detail=f"Produto {item.product_id} não encontrado"
                )
            products[product.id] = product
            unit_price = item.unit_price if item.unit_price is not None else product.sale_price
            subtotal += money(unit_price * item.quantity)
            for stock_id, required in _expand_product(
                db, organization_id, product, item.quantity
            ).items():
                required_stock[stock_id] += required.quantize(QTY)

        total = money(subtotal - payload.discount)
        if total < 0:
            raise HTTPException(status_code=422, detail="Desconto maior que o subtotal")
        paid = money(sum((p.amount for p in payload.payments), Decimal(0)))
        if paid != total:
            raise HTTPException(
                status_code=422,
                detail=f"Pagamentos ({paid}) devem ser iguais ao total ({total})",
            )

        customer = None
        if payload.customer_id:
            customer = db.scalar(
                select(Customer).where(
                    Customer.id == payload.customer_id,
                    Customer.organization_id == organization_id,
                )
            )
            if not customer:
                raise HTTPException(status_code=404, detail="Cliente não encontrado")

        sale = Sale(
            organization_id=organization_id,
            customer_id=payload.customer_id,
            operator_id=operator_id,
            subtotal=money(subtotal),
            discount=money(payload.discount),
            total=total,
        )
        db.add(sale)
        db.flush()

        consumed_cost: dict[str, Decimal] = defaultdict(Decimal)
        for product_id, required in sorted(required_stock.items()):
            remaining = required
            batches = db.scalars(
                select(StockBatch)
                .where(
                    StockBatch.organization_id == organization_id,
                    StockBatch.product_id == product_id,
                    StockBatch.quantity_available > 0,
                )
                .order_by(StockBatch.expires_at.asc().nullslast(), StockBatch.received_at.asc())
                .with_for_update()
            ).all()
            available = sum((b.quantity_available for b in batches), Decimal(0))
            if available < required:
                product_name = db.scalar(select(Product.name).where(Product.id == product_id))
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Estoque insuficiente para {product_name}: {available} disponível",
                )
            for batch in batches:
                if remaining <= 0:
                    break
                taken = min(remaining, batch.quantity_available)
                batch.quantity_available -= taken
                remaining -= taken
                consumed_cost[product_id] += taken * batch.unit_cost
                db.add(
                    StockMovement(
                        organization_id=organization_id,
                        product_id=product_id,
                        batch_id=batch.id,
                        sale_id=sale.id,
                        operator_id=operator_id,
                        movement_type="sale_out",
                        quantity=-taken,
                        unit_cost=batch.unit_cost,
                    )
                )

        for item in payload.items:
            product = products[item.product_id]
            unit_price = item.unit_price if item.unit_price is not None else product.sale_price
            expanded = _expand_product(db, organization_id, product, item.quantity)
            line_cost = Decimal(0)
            for stock_id, quantity in expanded.items():
                average_cost = consumed_cost[stock_id] / required_stock[stock_id]
                line_cost += average_cost * quantity
            db.add(
                SaleItem(
                    sale_id=sale.id,
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price=money(unit_price),
                    unit_cost=(line_cost / item.quantity).quantize(Decimal("0.0001")),
                    total=money(unit_price * item.quantity),
                )
            )

        for payment_input in payload.payments:
            payment = Payment(
                organization_id=organization_id,
                sale_id=sale.id,
                method=payment_input.method,
                amount=money(payment_input.amount),
                installments=payment_input.installments,
            )
            db.add(payment)
            if payment_input.method == PaymentMethod.CREDIT:
                assert customer is not None
                installment = money(payment_input.amount / payment_input.installments)
                allocated = Decimal(0)
                for number in range(1, payment_input.installments + 1):
                    amount = (
                        money(payment_input.amount - allocated)
                        if number == payment_input.installments
                        else installment
                    )
                    allocated += amount
                    db.add(
                        Receivable(
                            organization_id=organization_id,
                            customer_id=customer.id,
                            sale_id=sale.id,
                            original_amount=amount,
                            open_amount=amount,
                            due_date=datetime.now(UTC).date()
                            + timedelta(days=payment_input.due_days * number),
                        )
                    )
            else:
                db.add(
                    CashEntry(
                        organization_id=organization_id,
                        sale_id=sale.id,
                        operator_id=operator_id,
                        entry_type="income",
                        description=f"Venda {sale.id} — {payment_input.method.value}",
                        amount=money(payment_input.amount),
                    )
                )

        db.commit()
        db.refresh(sale)
        return sale
    except Exception:
        db.rollback()
        raise
