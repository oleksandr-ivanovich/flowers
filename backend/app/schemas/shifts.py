from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ShiftOpen(BaseModel):
    starting_cash: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)


class ShiftOut(BaseModel):
    id: int
    store_id: int
    cashier_id: int
    opened_at: datetime
    closed_at: datetime | None
    starting_cash: Decimal
    status: str

    class Config:
        from_attributes = True
