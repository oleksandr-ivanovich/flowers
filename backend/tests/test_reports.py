from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.db.models import (
    PaymentMethod,
    Shift,
    ShiftStatus,
    Store,
    Transaction,
    TransactionType,
    User,
    UserRole,
)
from app.services.reports import compute_shift_report


def _seed(db: Session) -> tuple[Store, User, Shift, dict[str, PaymentMethod]]:
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
        "cash": PaymentMethod(name="Готівка", sort_order=1),
        "card": PaymentMethod(name="Картка", sort_order=2),
        "wire": PaymentMethod(name="Переказ", sort_order=3),
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
    return store, cashier, shift, pms


def _tx(db, shift, cashier, type_, amount, pm=None):
    db.add(
        Transaction(
            shift_id=shift.id,
            store_id=shift.store_id,
            user_id=cashier.id,
            type=type_.value,
            amount=Decimal(str(amount)),
            payment_method_id=pm.id if pm else None,
        )
    )


def test_shift_report_golden_path(db: Session) -> None:
    _, cashier, shift, pms = _seed(db)

    _tx(db, shift, cashier, TransactionType.sale, "200", pms["cash"])
    _tx(db, shift, cashier, TransactionType.sale, "300", pms["card"])
    _tx(db, shift, cashier, TransactionType.sale, "150", pms["wire"])
    _tx(db, shift, cashier, TransactionType.deposit, "100")
    _tx(db, shift, cashier, TransactionType.withdrawal, "50")
    db.flush()

    r = compute_shift_report(db, shift)

    assert r.sales_total == Decimal("650.00")
    by_name = {i.name: i.amount for i in r.sales_by_payment}
    assert by_name["Готівка"] == Decimal("200.00")
    assert by_name["Картка"] == Decimal("300.00")
    assert by_name["Переказ"] == Decimal("150.00")
    assert r.deposits_total == Decimal("100.00")
    assert r.withdrawals_total == Decimal("50.00")
    # 500 + 200 (cash sales) + 100 (deposit) - 50 (withdrawal) = 750
    assert r.cash_in_register == Decimal("750.00")
    assert r.operations_count == 5
