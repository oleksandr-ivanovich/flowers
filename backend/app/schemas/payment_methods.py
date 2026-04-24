from pydantic import BaseModel, Field


class PaymentMethodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    is_active: bool = True
    sort_order: int = 0


class PaymentMethodUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None
    sort_order: int | None = None


class PaymentMethodOut(BaseModel):
    id: int
    name: str
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True
