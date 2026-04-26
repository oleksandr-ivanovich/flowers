from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.db.models import TransactionType


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_method_id: int | None = None
    customer_id: int | None = None
    comment: str | None = None

    @model_validator(mode="after")
    def _sale_needs_payment_method(self) -> "TransactionCreate":
        if self.type == TransactionType.sale and self.payment_method_id is None:
            raise ValueError("payment_method_id is required for sale")
        if self.type != TransactionType.sale and self.payment_method_id is not None:
            raise ValueError("payment_method_id is only allowed for sale")
        return self


class TransactionOut(BaseModel):
    id: int
    shift_id: int
    store_id: int
    user_id: int
    type: TransactionType
    amount: Decimal
    payment_method_id: int | None
    customer_id: int | None
    comment: str | None
    created_at: datetime

    class Config:
        from_attributes = True
