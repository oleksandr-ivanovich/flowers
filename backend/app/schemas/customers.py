from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=3, max_length=30)


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = Field(default=None, min_length=3, max_length=30)
    is_active: bool | None = None


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str
    bonus_balance: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerAdjustBonus(BaseModel):
    delta: Decimal = Field(max_digits=12, decimal_places=2)
    comment: str | None = Field(default=None, max_length=500)
