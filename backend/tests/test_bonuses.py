from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.transactions import create_transaction
from app.db.models import (
    Customer,
    PaymentMethod,
    Shift,
    ShiftStatus,
    Store,
    TransactionType,
    User,
    UserRole,
)
from app.schemas.transactions import TransactionCreate


def _seed(db: Session) -> tuple[User, Shift, dict[str, PaymentMethod], Customer]:
    store = Store(name="М1", is_active=True)
    db.add(store)
    db.flush()

    cashier = User(
        email="c@x",
        password_hash="-",
        full_name="Касир",
        role=UserRole.cashier.value,
        store_id=store.id,
    )
    db.add(cashier)
    db.flush()

    pms = {
        "cash": PaymentMethod(name="Готівка", is_bonus=False, sort_order=1),
        "card": PaymentMethod(name="Картка", is_bonus=False, sort_order=2),
        "bonus": PaymentMethod(name="Бонуси", is_bonus=True, sort_order=5),
    }
    for pm in pms.values():
        db.add(pm)
    db.flush()

    shift = Shift(
        store_id=store.id,
        cashier_id=cashier.id,
        opened_at=datetime.now(timezone.utc),
        starting_cash=Decimal("500"),
        status=ShiftStatus.open.value,
    )
    db.add(shift)
    db.flush()

    customer = Customer(name="Іван", phone="+380501234567", bonus_balance=Decimal("0"))
    db.add(customer)
    db.flush()

    return cashier, shift, pms, customer


def test_bonus_accrual_on_cash_sale(db: Session) -> None:
    cashier, _shift, pms, customer = _seed(db)
    body = TransactionCreate(
        type=TransactionType.sale,
        amount=Decimal("100"),
        payment_method_id=pms["cash"].id,
        customer_id=customer.id,
    )
    create_transaction(body, db, cashier)
    db.refresh(customer)
    assert customer.bonus_balance == Decimal("7.00")


def test_bonus_accrual_on_card_sale(db: Session) -> None:
    cashier, _shift, pms, customer = _seed(db)
    body = TransactionCreate(
        type=TransactionType.sale,
        amount=Decimal("200"),
        payment_method_id=pms["card"].id,
        customer_id=customer.id,
    )
    create_transaction(body, db, cashier)
    db.refresh(customer)
    assert customer.bonus_balance == Decimal("14.00")


def test_no_accrual_without_customer(db: Session) -> None:
    cashier, _shift, pms, _customer = _seed(db)
    body = TransactionCreate(
        type=TransactionType.sale,
        amount=Decimal("100"),
        payment_method_id=pms["cash"].id,
    )
    create_transaction(body, db, cashier)


def test_bonus_redemption_decrements_balance(db: Session) -> None:
    cashier, _shift, pms, customer = _seed(db)
    customer.bonus_balance = Decimal("100")
    db.flush()
    body = TransactionCreate(
        type=TransactionType.sale,
        amount=Decimal("50"),
        payment_method_id=pms["bonus"].id,
        customer_id=customer.id,
    )
    create_transaction(body, db, cashier)
    db.refresh(customer)
    assert customer.bonus_balance == Decimal("50.00")


def test_bonus_payment_without_customer_rejected(db: Session) -> None:
    cashier, _shift, pms, _customer = _seed(db)
    body = TransactionCreate(
        type=TransactionType.sale,
        amount=Decimal("50"),
        payment_method_id=pms["bonus"].id,
    )
    with pytest.raises(HTTPException) as exc:
        create_transaction(body, db, cashier)
    assert exc.value.status_code == 400


def test_bonus_payment_insufficient_balance(db: Session) -> None:
    cashier, _shift, pms, customer = _seed(db)
    customer.bonus_balance = Decimal("5")
    db.flush()
    body = TransactionCreate(
        type=TransactionType.sale,
        amount=Decimal("100"),
        payment_method_id=pms["bonus"].id,
        customer_id=customer.id,
    )
    with pytest.raises(HTTPException) as exc:
        create_transaction(body, db, cashier)
    assert exc.value.status_code == 400


def test_bonus_not_accrued_on_bonus_payment(db: Session) -> None:
    cashier, _shift, pms, customer = _seed(db)
    customer.bonus_balance = Decimal("100")
    db.flush()
    body = TransactionCreate(
        type=TransactionType.sale,
        amount=Decimal("30"),
        payment_method_id=pms["bonus"].id,
        customer_id=customer.id,
    )
    create_transaction(body, db, cashier)
    db.refresh(customer)
    # paid 30 with bonus -> 70 left, no extra accrual
    assert customer.bonus_balance == Decimal("70.00")


def test_partial_payment_two_transactions(db: Session) -> None:
    cashier, _shift, pms, customer = _seed(db)
    customer.bonus_balance = Decimal("100")
    db.flush()
    # 100 cash sale: +7 bonus
    create_transaction(
        TransactionCreate(
            type=TransactionType.sale,
            amount=Decimal("100"),
            payment_method_id=pms["cash"].id,
            customer_id=customer.id,
        ),
        db,
        cashier,
    )
    # 50 bonus sale: -50 bonus
    create_transaction(
        TransactionCreate(
            type=TransactionType.sale,
            amount=Decimal("50"),
            payment_method_id=pms["bonus"].id,
            customer_id=customer.id,
        ),
        db,
        cashier,
    )
    db.refresh(customer)
    # 100 + 7 - 50 = 57
    assert customer.bonus_balance == Decimal("57.00")
