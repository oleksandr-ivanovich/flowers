from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.base import get_db
from app.db.models import PaymentMethod, User, UserRole
from app.schemas.payment_methods import PaymentMethodCreate, PaymentMethodOut, PaymentMethodUpdate

router = APIRouter(prefix="/api/payment-methods", tags=["payment_methods"])


@router.get("", response_model=list[PaymentMethodOut])
def list_payment_methods(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[PaymentMethod]:
    q = select(PaymentMethod).order_by(PaymentMethod.sort_order, PaymentMethod.id)
    if not include_inactive:
        q = q.where(PaymentMethod.is_active.is_(True))
    return list(db.execute(q).scalars().all())


@router.post("", response_model=PaymentMethodOut, status_code=status.HTTP_201_CREATED)
def create_payment_method(
    body: PaymentMethodCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner, UserRole.store_admin)),
) -> PaymentMethod:
    if db.execute(select(PaymentMethod).where(PaymentMethod.name == body.name)).scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "name already exists")
    pm = PaymentMethod(**body.model_dump())
    db.add(pm)
    db.commit()
    db.refresh(pm)
    return pm


@router.patch("/{pm_id}", response_model=PaymentMethodOut)
def update_payment_method(
    pm_id: int,
    body: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner, UserRole.store_admin)),
) -> PaymentMethod:
    pm = db.get(PaymentMethod, pm_id)
    if not pm:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "payment method not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(pm, key, value)
    db.commit()
    db.refresh(pm)
    return pm
