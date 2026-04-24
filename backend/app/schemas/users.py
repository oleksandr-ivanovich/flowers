from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.db.models import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    role: UserRole
    store_id: int | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    role: UserRole | None = None
    store_id: int | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    store_id: int | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
