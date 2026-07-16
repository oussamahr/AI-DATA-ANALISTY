import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security.auth import decode_access_token, decode_oidc_token, hash_password
from app.core.security.exceptions import AppException
from app.core.security.session import get_session_store
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def _safe_uuid(value: str | None) -> uuid.UUID | None:
    if value is None:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


async def _resolve_session_user(request, db: AsyncSession) -> User | None:
    if not settings.SESSION_COOKIE_ENABLED:
        return None
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id:
        return None
    session_store = get_session_store()
    session = await session_store.get_session(session_id)
    if session is None:
        return None
    user_id = _safe_uuid(session.user_id)
    if user_id is None:
        return None
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    request.state.session_id = session.session_id
    request.state.csrf_token = session.csrf_token
    return user


async def _resolve_bearer_user(token: str, db: AsyncSession) -> User | None:
    payload = decode_access_token(token)
    if payload is not None:
        user_id = _safe_uuid(payload.get("sub"))
        if user_id is None:
            return None
        return await db.get(User, user_id)

    oidc_payload = await decode_oidc_token(token)
    if oidc_payload is None:
        return None

    email = oidc_payload.get(settings.OIDC_EMAIL_CLAIM) or oidc_payload.get("email")
    if email is None:
        return None
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is not None:
        return user if user.is_active else None

    if not settings.OIDC_AUTO_PROVISION_USERS:
        return None

    user = User(
        id=uuid.uuid4(),
        email=email,
        hashed_password=hash_password(uuid.uuid4().hex),
        first_name="",
        last_name="",
        is_verified=bool(oidc_payload.get(settings.OIDC_EMAIL_VERIFIED_CLAIM, False)),
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_session),
) -> User:
    if credentials is not None:
        user = await _resolve_bearer_user(credentials.credentials, db)
        if user is not None and user.is_active:
            return user

    user = await _resolve_session_user(request, db)
    if user is not None:
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_session),
) -> User | None:
    if credentials is not None:
        user = await _resolve_bearer_user(credentials.credentials, db)
        if user is not None and user.is_active:
            return user
    return await _resolve_session_user(request, db)


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return current_user


async def require_verified(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return current_user


def require_role(role_name: str):
    async def _require_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        if current_user.role is None or current_user.role.name.lower() != role_name.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        return current_user

    return _require_role


def require_permission(permission: str):
    async def _require_permission(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        if current_user.role is None or permission not in (current_user.role.permissions or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        return current_user

    return _require_permission


async def require_tenant_owner(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return current_user


def require_auth_mode(mode: str):
    async def _check() -> bool:
        if mode != settings.AUTH_MODE:
            raise AppException(
                f"This endpoint requires AUTH_MODE={mode} (current: {settings.AUTH_MODE})",
                403,
            )
        return True

    return _check
