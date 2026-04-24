from __future__ import annotations

import csv
import io
from decimal import Decimal
from typing import Any

from openpyxl import Workbook

from app.schemas.reports import NetworkReport, ShiftReport, StoreReport


def _fmt(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return f"{value:.2f}"
    return str(value)


def shift_report_rows(r: ShiftReport) -> list[list[str]]:
    rows: list[list[str]] = [
        ["Звіт по зміні"],
        ["Магазин", r.store_name],
        ["Касир", r.cashier_name],
        ["Відкрито", _fmt(r.opened_at)],
        ["Закрито", _fmt(r.closed_at)],
        ["Статус", r.status],
        ["Стартова сума", _fmt(r.starting_cash)],
        [],
        ["Продажі (всього)", _fmt(r.sales_total)],
    ]
    for item in r.sales_by_payment:
        rows.append([f"  {item.name}", _fmt(item.amount)])
    rows.extend(
        [
            ["Внесення (всього)", _fmt(r.deposits_total)],
            ["Вилучення (всього)", _fmt(r.withdrawals_total)],
            ["Готівка в касі (підсумок)", _fmt(r.cash_in_register)],
            ["Кількість операцій", _fmt(r.operations_count)],
        ]
    )
    return rows


def store_report_rows(r: StoreReport) -> list[list[str]]:
    rows: list[list[str]] = [
        ["Звіт по магазину"],
        ["Магазин", r.store_name],
        ["Період з", _fmt(r.date_from)],
        ["Період по", _fmt(r.date_to)],
        [],
        ["Продажі (всього)", _fmt(r.sales_total)],
    ]
    for item in r.sales_by_payment:
        rows.append([f"  {item.name}", _fmt(item.amount)])
    rows.extend(
        [
            ["Внесення", _fmt(r.deposits_total)],
            ["Вилучення", _fmt(r.withdrawals_total)],
            ["Кількість змін", _fmt(r.shifts_count)],
            ["Кількість операцій", _fmt(r.operations_count)],
        ]
    )
    return rows


def network_report_rows(r: NetworkReport) -> list[list[str]]:
    rows: list[list[str]] = [
        ["Зведений звіт по мережі"],
        ["Період з", _fmt(r.date_from)],
        ["Період по", _fmt(r.date_to)],
        [],
        ["Продажі (всього)", _fmt(r.sales_total)],
    ]
    for item in r.sales_by_payment:
        rows.append([f"  {item.name}", _fmt(item.amount)])
    rows.extend(
        [
            ["Внесення", _fmt(r.deposits_total)],
            ["Вилучення", _fmt(r.withdrawals_total)],
            ["Кількість операцій", _fmt(r.operations_count)],
            [],
            ["Магазин", "Продажі", "Внесення", "Вилучення", "Операцій"],
        ]
    )
    for s in r.stores:
        rows.append(
            [
                s.store_name,
                _fmt(s.sales_total),
                _fmt(s.deposits_total),
                _fmt(s.withdrawals_total),
                _fmt(s.operations_count),
            ]
        )
    return rows


def to_csv(rows: list[list[str]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerows(rows)
    # UTF-8 BOM so Excel on Windows opens it correctly
    return ("\ufeff" + buf.getvalue()).encode("utf-8")


def to_xlsx(rows: list[list[str]], sheet_name: str = "Звіт") -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31] or "Звіт"
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
