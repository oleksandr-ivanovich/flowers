from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import hash_password
from app.db.base import get_db
from app.db.models import AuditLog, Shift, Store, Transaction, User, UserRole
from app.schemas.users import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _can_manage(actor: User, target_store_id: int | None, target_role: UserRole | None) -> bool:
    if actor.role == UserRole.owner.value:
        return True
    if actor.role == UserRole.store_admin.value:
        # store_admin can only manage cashiers within their own store
        if target_role and target_role != UserRole.cashier:
            return False
        return target_store_id == actor.store_id and target_store_id is not None
    return False


@router.get("", response_model=list[UserOut])
def list_users(
    store_id: int | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[User]:
    q = select(User).order_by(User.full_name)
    if actor.role == UserRole.owner.value:
        if store_id is not None:
            q = q.where(User.store_id == store_id)
    elif actor.role == UserRole.store_admin.value:
        q = q.where(User.store_id == actor.store_id)
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    return list(db.execute(q).scalars().all())


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> User:
    if not _can_manage(actor, body.store_id, body.role):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    if body.role != UserRole.owner and body.store_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "store_id is required for this role")
    if body.store_id is not None and not db.get(Store, body.store_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "store not found")
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "email already exists")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role.value,
        store_id=body.store_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    new_store_id = body.store_id if body.store_id is not None else user.store_id
    new_role = body.role if body.role is not None else UserRole(user.role)
    if not _can_manage(actor, new_store_id, new_role):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    data = body.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    else:
        data.pop("password", None)
    if "role" in data:
        data["role"] = data["role"].value
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> Response:
    """TEST-ONLY: hard delete of a user with all their shifts and transactions."""
    if actor.role != UserRole.owner.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    if actor.id == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "cannot delete yourself")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    shift_ids = [
        s for (s,) in db.execute(select(Shift.id).where(Shift.cashier_id == user_id)).all()
    ]
    if shift_ids:
        db.execute(delete(Transaction).where(Transaction.shift_id.in_(shift_ids)))
        db.execute(delete(Shift).where(Shift.id.in_(shift_ids)))
    db.execute(delete(Transaction).where(Transaction.user_id == user_id))
    db.execute(delete(AuditLog).where(AuditLog.user_id == user_id))
    db.execute(delete(User).where(User.id == user_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
