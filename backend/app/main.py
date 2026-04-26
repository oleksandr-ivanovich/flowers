from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    auth,
    customers,
    payment_methods,
    reports,
    shifts,
    stores,
    transactions,
    users,
)
from app.core.audit import AuditLogMiddleware
from app.core.config import settings

app = FastAPI(title="Marina Cashier API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditLogMiddleware)

app.include_router(auth.router)
app.include_router(stores.router)
app.include_router(users.router)
app.include_router(payment_methods.router)
app.include_router(customers.router)
app.include_router(shifts.router)
app.include_router(transactions.router)
app.include_router(reports.router)


@app.get("/api/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
