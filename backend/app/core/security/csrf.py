from fastapi import HTTPException, Request, status

from app.core.config import settings

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _session_cookie_present(request: Request) -> bool:
    return bool(request.cookies.get(settings.SESSION_COOKIE_NAME))


def _csrf_cookie_present(request: Request) -> bool:
    return bool(request.cookies.get(settings.CSRF_COOKIE_NAME))


async def validate_csrf(request: Request) -> None:
    if request.method not in UNSAFE_METHODS:
        return
    if not settings.SESSION_COOKIE_ENABLED:
        return
    if not _session_cookie_present(request):
        return

    csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
    csrf_header = request.headers.get("X-CSRF-Token")
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed",
        )


def set_csrf_cookie_headers(response, csrf_token: str) -> None:
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=True,
        samesite="strict",
        path="/",
    )
