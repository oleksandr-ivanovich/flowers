from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.deps import ACCESS_COOKIE
from app.core.security import decode_access_token
from app.db.base import SessionLocal
from app.db.models import AuditLog

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_SKIP_PATHS = {"/api/healthz"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if (
            request.method not in _MUTATING_METHODS
            or not request.url.path.startswith("/api/")
            or request.url.path in _SKIP_PATHS
            or response.status_code >= 500
        ):
            return response

        # Successful mutations only
        if response.status_code >= 400:
            return response

        user_id: int | None = None
        token = request.cookies.get(ACCESS_COOKIE)
        if token:
            try:
                payload = decode_access_token(token)
                sub = payload.get("sub")
                if sub:
                    user_id = int(sub)
            except ValueError:
                user_id = None

        action = f"{request.method} {request.url.path}"
        entity_type = _entity_type(request.url.path)

        try:
            with SessionLocal() as db:
                db.add(
                    AuditLog(
                        user_id=user_id,
                        action=action,
                        entity_type=entity_type,
                        entity_id=None,
                        details={
                            "path": request.url.path,
                            "method": request.method,
                            "status": response.status_code,
                        },
                    )
                )
                db.commit()
        except Exception:
            # Never break the response pipeline because of audit logging
            pass

        return response


def _entity_type(path: str) -> str:
    # /api/<segment>/... — take <segment>
    parts = path.strip("/").split("/")
    if len(parts) >= 2 and parts[0] == "api":
        return parts[1]
    return "other"
