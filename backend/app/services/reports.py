from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import PaymentMethod, Shift, Store, Transaction, TransactionType, User
from app.schemas.reports import (
    NetworkReport,
    PaymentBreakdownItem,
    ShiftReport,
    StoreReport,
    StoreSummary,
)

Z = Decimal("0")


def _sum(db: Session, q) -> Decimal:
    value = db.execute(q).scalar()
    return Decimal(value) if value is not None else Z


def _sales_by_payment(
    db: Session, tx_filter
) -> tuple[list[PaymentBreakdownItem], Decimal]:
    rows = db.execute(
        select(
            Transaction.payment_method_id,
            PaymentMethod.name,
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .select_from(Transaction)
        .join(PaymentMethod, PaymentMethod.id == Transaction.payment_method_id, isouter=True)
        .where(Transaction.type == TransactionType.sale.value, *tx_filter)
        .group_by(Transaction.payment_method_id, PaymentMethod.name)
        .order_by(PaymentMethod.name)
    ).all()
    items = [
        PaymentBreakdownItem(
            payment_method_id=row[0],
            name=row[1] or "—",
            amount=Decimal(row[2]),
        )
        for row in rows
    ]
    total = sum((i.amount for i in items), Z)
    return items, total


def compute_shift_report(db: Session, shift: Shift) -> ShiftReport:
    store = db.get(Store, shift.store_id)
    cashier = db.get(User, shift.cashier_id)
    filters = (Transaction.shift_id == shift.id,)

    sales_by_payment, sales_total = _sales_by_payment(db, filters)
    deposits_total = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TransactionType.deposit.value, *filters
        ),
    )
    withdrawals_total = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TransactionType.withdrawal.value, *filters
        ),
    )
    cash_sales = sum(
        (i.amount for i in sales_by_payment if (i.name or "").lower() == "готівка"), Z
    )
    cash_in_register = Decimal(shift.starting_cash) + cash_sales + deposits_total - withdrawals_total
    ops_count = int(
        db.execute(
            select(func.count(Transaction.id)).where(*filters)
        ).scalar_one()
    )

    return ShiftReport(
        shift_id=shift.id,
        store_id=shift.store_id,
        store_name=store.name if store else "",
        cashier_id=shift.cashier_id,
        cashier_name=cashier.full_name if cashier else "",
        opened_at=shift.opened_at,
        closed_at=shift.closed_at,
        status=shift.status,
        starting_cash=Decimal(shift.starting_cash),
        sales_total=sales_total,
        sales_by_payment=sales_by_payment,
        deposits_total=deposits_total,
        withdrawals_total=withdrawals_total,
        cash_in_register=cash_in_register,
        operations_count=ops_count,
    )


def _store_filters(store_id: int, date_from: datetime | None, date_to: datetime | None):
    f = [Transaction.store_id == store_id]
    if date_from:
        f.append(Transaction.created_at >= date_from)
    if date_to:
        f.append(Transaction.created_at <= date_to)
    return tuple(f)


def compute_store_report(
    db: Session, store_id: int, date_from: datetime | None, date_to: datetime | None
) -> StoreReport:
    store = db.get(Store, store_id)
    filters = _store_filters(store_id, date_from, date_to)

    sales_by_payment, sales_total = _sales_by_payment(db, filters)
    deposits_total = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TransactionType.deposit.value, *filters
        ),
    )
    withdrawals_total = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TransactionType.withdrawal.value, *filters
        ),
    )
    ops_count = int(
        db.execute(select(func.count(Transaction.id)).where(*filters)).scalar_one()
    )

    shift_filters = [Shift.store_id == store_id]
    if date_from:
        shift_filters.append(Shift.opened_at >= date_from)
    if date_to:
        shift_filters.append(Shift.opened_at <= date_to)
    shifts_count = int(
        db.execute(select(func.count(Shift.id)).where(*shift_filters)).scalar_one()
    )

    return StoreReport(
        store_id=store_id,
        store_name=store.name if store else "",
        date_from=date_from,
        date_to=date_to,
        sales_total=sales_total,
        sales_by_payment=sales_by_payment,
        deposits_total=deposits_total,
        withdrawals_total=withdrawals_total,
        shifts_count=shifts_count,
        operations_count=ops_count,
    )


def compute_network_report(
    db: Session, date_from: datetime | None, date_to: datetime | None
) -> NetworkReport:
    filters = []
    if date_from:
        filters.append(Transaction.created_at >= date_from)
    if date_to:
        filters.append(Transaction.created_at <= date_to)
    filters_t = tuple(filters)

    sales_by_payment, sales_total = _sales_by_payment(db, filters_t)
    deposits_total = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TransactionType.deposit.value, *filters_t
        ),
    )
    withdrawals_total = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TransactionType.withdrawal.value, *filters_t
        ),
    )
    ops_count = int(
        db.execute(select(func.count(Transaction.id)).where(*filters_t)).scalar_one()
    )

    stores_result: list[StoreSummary] = []
    store_rows = db.execute(select(Store).order_by(Store.name)).scalars().all()
    for store in store_rows:
        st_filters = _store_filters(store.id, date_from, date_to)
        _, st_sales = _sales_by_payment(db, st_filters)
        st_dep = _sum(
            db,
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.type == TransactionType.deposit.value, *st_filters
            ),
        )
        st_wd = _sum(
            db,
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.type == TransactionType.withdrawal.value, *st_filters
            ),
        )
        st_ops = int(
            db.execute(select(func.count(Transaction.id)).where(*st_filters)).scalar_one()
        )
        stores_result.append(
            StoreSummary(
                store_id=store.id,
                store_name=store.name,
                sales_total=st_sales,
                deposits_total=st_dep,
                withdrawals_total=st_wd,
                operations_count=st_ops,
            )
        )
    return NetworkReport(
        date_from=date_from,
        date_to=date_to,
        sales_total=sales_total,
        sales_by_payment=sales_by_payment,
        deposits_total=deposits_total,
        withdrawals_total=withdrawals_total,
        stores=stores_result,
        operations_count=ops_count,
    )
