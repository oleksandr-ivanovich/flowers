from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Shift, ShiftStatus, User


def get_open_shift_for_cashier(db: Session, cashier: User) -> Shift | None:
    if cashier.store_id is None:
        return None
    return db.execute(
        select(Shift).where(
            Shift.store_id == cashier.store_id,
            Shift.cashier_id == cashier.id,
            Shift.status == ShiftStatus.open.value,
        )
    ).scalar_one_or_none()


def get_open_shift_for_store(db: Session, store_id: int) -> Shift | None:
    return db.execute(
        select(Shift).where(
            Shift.store_id == store_id, Shift.status == ShiftStatus.open.value
        )
    ).scalar_one_or_none()


def open_shift(db: Session, cashier: User, starting_cash: Decimal) -> Shift:
    if cashier.store_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "user is not assigned to a store")
    shift = Shift(
        store_id=cashier.store_id,
        cashier_id=cashier.id,
        starting_cash=starting_cash,
        status=ShiftStatus.open.value,
    )
    db.add(shift)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "there is already an open shift for this store"
        )
    db.refresh(shift)
    return shift


def close_shift(db: Session, shift: Shift) -> Shift:
    if shift.status != ShiftStatus.open.value:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "shift is already closed")
    shift.status = ShiftStatus.closed.value
    shift.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(shift)
    return shift
