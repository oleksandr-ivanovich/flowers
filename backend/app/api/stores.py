from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.base import get_db
from app.db.models import Store, User, UserRole
from app.schemas.stores import StoreCreate, StoreOut, StoreUpdate

router = APIRouter(prefix="/api/stores", tags=["stores"])


@router.get("", response_model=list[StoreOut])
def list_stores(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Store]:
    q = select(Store).order_by(Store.name)
    if user.role != UserRole.owner.value:
        if user.store_id is None:
            return []
        q = q.where(Store.id == user.store_id)
    return list(db.execute(q).scalars().all())


@router.post("", response_model=StoreOut, status_code=status.HTTP_201_CREATED)
def create_store(
    body: StoreCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> Store:
    store = Store(**body.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.patch("/{store_id}", response_model=StoreOut)
def update_store(
    store_id: int,
    body: StoreUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> Store:
    store = db.get(Store, store_id)
    if not store:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "store not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(store, key, value)
    db.commit()
    db.refresh(store)
    return store
