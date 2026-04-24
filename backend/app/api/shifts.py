from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import get_db
from app.db.models import Shift, User, UserRole
from app.schemas.shifts import ShiftOpen, ShiftOut
from app.services import shifts as shift_service

router = APIRouter(prefix="/api/shifts", tags=["shifts"])


def _can_read_shift(user: User, shift: Shift) -> bool:
    if user.role == UserRole.owner.value:
        return True
    return user.store_id == shift.store_id


@router.post("/open", response_model=ShiftOut, status_code=status.HTTP_201_CREATED)
def open_shift(
    body: ShiftOpen,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Shift:
    if user.role not in (UserRole.cashier.value, UserRole.store_admin.value):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "only cashier can open a shift")
    return shift_service.open_shift(db, user, body.starting_cash)


@router.post("/{shift_id}/close", response_model=ShiftOut)
def close_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Shift:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "shift not found")
    if not _can_read_shift(user, shift):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    if user.role == UserRole.cashier.value and shift.cashier_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your shift")
    return shift_service.close_shift(db, shift)


@router.get("/me/current", response_model=ShiftOut | None)
def my_current_shift(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Shift | None:
    return shift_service.get_open_shift_for_cashier(db, user)


@router.get("", response_model=list[ShiftOut])
def list_shifts(
    store_id: int | None = None,
    status_filter: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Shift]:
    q = select(Shift).order_by(Shift.opened_at.desc())
    if user.role != UserRole.owner.value:
        if user.store_id is None:
            return []
        q = q.where(Shift.store_id == user.store_id)
    elif store_id is not None:
        q = q.where(Shift.store_id == store_id)
    if status_filter:
        q = q.where(Shift.status == status_filter)
    if date_from:
        q = q.where(Shift.opened_at >= date_from)
    if date_to:
        q = q.where(Shift.opened_at <= date_to)
    return list(db.execute(q).scalars().all())


@router.get("/{shift_id}", response_model=ShiftOut)
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Shift:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "shift not found")
    if not _can_read_shift(user, shift):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    return shift
