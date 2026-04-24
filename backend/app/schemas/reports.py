from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentBreakdownItem(BaseModel):
    payment_method_id: int | None
    name: str
    amount: Decimal


class ShiftReport(BaseModel):
    shift_id: int
    store_id: int
    store_name: str
    cashier_id: int
    cashier_name: str
    opened_at: datetime
    closed_at: datetime | None
    status: str
    starting_cash: Decimal

    sales_total: Decimal
    sales_by_payment: list[PaymentBreakdownItem]
    deposits_total: Decimal
    withdrawals_total: Decimal
    cash_in_register: Decimal
    operations_count: int


class StoreReport(BaseModel):
    store_id: int
    store_name: str
    date_from: datetime | None
    date_to: datetime | None

    sales_total: Decimal
    sales_by_payment: list[PaymentBreakdownItem]
    deposits_total: Decimal
    withdrawals_total: Decimal
    shifts_count: int
    operations_count: int


class StoreSummary(BaseModel):
    store_id: int
    store_name: str
    sales_total: Decimal
    deposits_total: Decimal
    withdrawals_total: Decimal
    operations_count: int


class NetworkReport(BaseModel):
    date_from: datetime | None
    date_to: datetime | None

    sales_total: Decimal
    sales_by_payment: list[PaymentBreakdownItem]
    deposits_total: Decimal
    withdrawals_total: Decimal
    stores: list[StoreSummary]
    operations_count: int
