from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.base import get_db
from app.db.models import Customer, Transaction, User, UserRole
from app.schemas.customers import (
    CustomerAdjustBonus,
    CustomerCreate,
    CustomerOut,
    CustomerUpdate,
)

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    q: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Customer]:
    stmt = select(Customer).order_by(Customer.name)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Customer.name.ilike(like), Customer.phone.ilike(like)))
    stmt = stmt.limit(min(max(limit, 1), 500))
    return list(db.execute(stmt).scalars().all())


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "customer not found")
    return customer


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> Customer:
    if db.execute(select(Customer).where(Customer.phone == body.phone)).scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "phone already exists")
    customer = Customer(name=body.name, phone=body.phone)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    body: CustomerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "customer not found")
    data = body.model_dump(exclude_unset=True)
    if "phone" in data and data["phone"] != customer.phone:
        existing = db.execute(
            select(Customer).where(Customer.phone == data["phone"])
        ).scalar_one_or_none()
        if existing and existing.id != customer.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "phone already exists")
    for key, value in data.items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.post("/{customer_id}/adjust", response_model=CustomerOut)
def adjust_bonus(
    customer_id: int,
    body: CustomerAdjustBonus,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "customer not found")
    new_balance = customer.bonus_balance + body.delta
    if new_balance < Decimal(0):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "balance cannot become negative")
    customer.bonus_balance = new_balance
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> Response:
    """TEST-ONLY: hard delete; transactions get customer_id=NULL via FK ON DELETE SET NULL."""
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "customer not found")
    db.execute(
        Transaction.__table__.update()
        .where(Transaction.customer_id == customer_id)
        .values(customer_id=None)
    )
    db.delete(customer)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
