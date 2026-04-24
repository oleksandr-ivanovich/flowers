from datetime import datetime

from pydantic import BaseModel, Field


class StoreBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: str | None = None
    is_active: bool = True


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    address: str | None = None
    is_active: bool | None = None


class StoreOut(StoreBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
