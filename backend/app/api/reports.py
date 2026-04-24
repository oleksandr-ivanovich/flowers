from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.base import get_db
from app.db.models import Shift, User, UserRole
from app.schemas.reports import NetworkReport, ShiftReport, StoreReport
from app.services import export as export_service
from app.services import reports as reports_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _can_access_shift(user: User, shift: Shift) -> bool:
    if user.role == UserRole.owner.value:
        return True
    return user.store_id == shift.store_id


def _can_access_store(user: User, store_id: int) -> bool:
    if user.role == UserRole.owner.value:
        return True
    return user.store_id == store_id


@router.get("/shift/{shift_id}", response_model=ShiftReport)
def shift_report(
    shift_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShiftReport:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "shift not found")
    if not _can_access_shift(user, shift):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    return reports_service.compute_shift_report(db, shift)


@router.get("/store/{store_id}", response_model=StoreReport)
def store_report(
    store_id: int,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StoreReport:
    if not _can_access_store(user, store_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    return reports_service.compute_store_report(db, store_id, date_from, date_to)


@router.get("/network", response_model=NetworkReport)
def network_report(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> NetworkReport:
    return reports_service.compute_network_report(db, date_from, date_to)


_Fmt = Literal["csv", "xlsx"]


def _send(rows: list[list[str]], fmt: _Fmt, filename: str) -> Response:
    if fmt == "csv":
        data = export_service.to_csv(rows)
        media = "text/csv; charset=utf-8"
        ext = "csv"
    else:
        data = export_service.to_xlsx(rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}.{ext}"'},
    )


@router.get("/shift/{shift_id}/export")
def export_shift(
    shift_id: int,
    format: _Fmt = "xlsx",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "shift not found")
    if not _can_access_shift(user, shift):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    report = reports_service.compute_shift_report(db, shift)
    rows = export_service.shift_report_rows(report)
    return _send(rows, format, f"shift-{shift_id}")


@router.get("/store/{store_id}/export")
def export_store(
    store_id: int,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    format: _Fmt = "xlsx",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    if not _can_access_store(user, store_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    report = reports_service.compute_store_report(db, store_id, date_from, date_to)
    rows = export_service.store_report_rows(report)
    return _send(rows, format, f"store-{store_id}")


@router.get("/network/export")
def export_network(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    format: _Fmt = "xlsx",
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.owner)),
) -> Response:
    report = reports_service.compute_network_report(db, date_from, date_to)
    rows = export_service.network_report_rows(report)
    return _send(rows, format, "network")
