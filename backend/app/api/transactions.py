from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.base import get_db
from app.db.models import (
    Customer,
    PaymentMethod,
    Transaction,
    TransactionType,
    User,
    UserRole,
)
from app.schemas.transactions import TransactionCreate, TransactionOut
from app.services import shifts as shift_service

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Transaction:
    if user.role == UserRole.owner.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "owner cannot add transactions")
    shift = shift_service.get_open_shift_for_cashier(db, user)
    if not shift:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no open shift")

    pm: PaymentMethod | None = None
    if body.payment_method_id is not None:
        pm = db.get(PaymentMethod, body.payment_method_id)
        if not pm or not pm.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid payment method")

    customer: Customer | None = None
    if body.customer_id is not None:
        customer = db.get(Customer, body.customer_id)
        if not customer or not customer.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid customer")

    if pm is not None and pm.is_bonus:
        if body.type != TransactionType.sale:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "bonus payment only for sales")
        if customer is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "bonus payment requires customer_id"
            )
        if customer.bonus_balance < body.amount:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "insufficient bonus balance")
        customer.bonus_balance = customer.bonus_balance - body.amount
    elif customer is not None and body.type == TransactionType.sale:
        rate = Decimal(settings.BONUS_RATE_PERCENT) / Decimal(100)
        accrual = (body.amount * rate).quantize(Decimal("0.01"))
        customer.bonus_balance = customer.bonus_balance + accrual

    tx = Transaction(
        shift_id=shift.id,
        store_id=shift.store_id,
        user_id=user.id,
        type=body.type.value,
        amount=body.amount,
        payment_method_id=body.payment_method_id,
        customer_id=body.customer_id,
        comment=body.comment,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    shift_id: int | None = None,
    store_id: int | None = None,
    type: TransactionType | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Transaction]:
    q = select(Transaction).order_by(Transaction.created_at.desc())
    if user.role != UserRole.owner.value:
        if user.store_id is None:
            return []
        q = q.where(Transaction.store_id == user.store_id)
    elif store_id is not None:
        q = q.where(Transaction.store_id == store_id)
    if shift_id:
        q = q.where(Transaction.shift_id == shift_id)
    if type:
        q = q.where(Transaction.type == type.value)
    if date_from:
        q = q.where(Transaction.created_at >= date_from)
    if date_to:
        q = q.where(Transaction.created_at <= date_to)
    q = q.limit(min(max(limit, 1), 1000))
    return list(db.execute(q).scalars().all())
