import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

BODY_SIZE_LIMIT_DEFAULT = 10 * 1024 * 1024  # 10MB default
BODY_SIZE_LIMIT_UPLOAD = 100 * 1024 * 1024  # 100MB for upload endpoints

UPLOAD_PATHS = {"/api/v1/datasets/upload"}


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from app.core.security.csrf import validate_csrf

        await validate_csrf(request)
        return await call_next(request)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
            except ValueError:
                return JSONResponse(status_code=413, content={"detail": "Invalid content-length"})

            limit = BODY_SIZE_LIMIT_UPLOAD if request.url.path in UPLOAD_PATHS else BODY_SIZE_LIMIT_DEFAULT
            if size > limit:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request body too large. Maximum size: {limit // (1024 * 1024)}MB"},
                )

        return await call_next(request)


class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        path = request.url.path
        method = request.method

        if method != "GET":
            response.headers["Cache-Control"] = "no-store"
        elif path.startswith("/api/v1/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        else:
            response.headers["Cache-Control"] = "no-store"

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'"
        )
        response.headers["Content-Security-Policy"] = csp

        return response
