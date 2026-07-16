import logging

from fastapi import Request, Response
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("opencode.rate_limiter")

_limiter = Limiter(key_func=get_remote_address)


def _get_user_or_ip(request: Request) -> str:
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "id"):
        return f"user:{user.id}"
    return get_remote_address(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from app.core.config import settings

        path = request.url.path
        is_auth_path = path.startswith("/api/v1/auth/")

        key = _get_user_or_ip(request)

        if is_auth_path:
            limit = settings.RATE_LIMIT_AUTH_BURST
        else:
            limit = settings.RATE_LIMIT_USER

        try:
            is_limited = await _limiter.is_limited(request, limit)
        except Exception:
            is_limited = False

        if is_limited:
            logger.warning("Rate limit exceeded", extra={"key": key, "path": path})
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "request_id": getattr(request.state, "request_id", None)},
                headers={"Retry-After": "60"},
            )

        response: Response = await call_next(request)
        return response
