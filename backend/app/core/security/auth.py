from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from jose import JWTError, jwk, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class OIDCClaims(BaseModel):
    sub: str
    email: EmailStr | None = None
    email_verified: bool | None = None
    iss: str | None = None
    aud: str | list[str] | None = None
    exp: int | None = None
    iat: int | None = None


_oidc_jwks_cache: dict[str, Any] | None = None
_oidc_jwks_cache_time: float = 0.0
_OIDC_JWKS_CACHE_TTL: float = 3600.0  # 1 hour


async def _fetch_oidc_jwks() -> dict[str, Any]:
    global _oidc_jwks_cache, _oidc_jwks_cache_time
    now = datetime.now(UTC).timestamp()
    if _oidc_jwks_cache is not None and (now - _oidc_jwks_cache_time) < _OIDC_JWKS_CACHE_TTL:
        return _oidc_jwks_cache
    if not settings.OIDC_JWKS_URL:
        raise ValueError("OIDC_JWKS_URL is not configured")
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(settings.OIDC_JWKS_URL)
        response.raise_for_status()
    _oidc_jwks_cache = response.json()
    _oidc_jwks_cache_time = now
    return _oidc_jwks_cache


async def decode_oidc_token(token: str) -> dict[str, Any] | None:
    if not settings.OIDC_ISSUER_URL or not settings.OIDC_AUDIENCE or not settings.OIDC_JWKS_URL:
        return None

    try:
        header = jwt.get_unverified_header(token)
        jwks = await _fetch_oidc_jwks()
        keys = jwks.get("keys", [])
        key_data = next((key for key in keys if key.get("kid") == header.get("kid")), None)
        if key_data is None:
            return None
        key = jwk.construct(key_data, algorithm=header.get("alg", settings.ALGORITHM))
        payload = jwt.decode(
            token,
            key.to_pem().decode("utf-8"),
            algorithms=[header.get("alg", settings.ALGORITHM)],
            audience=settings.OIDC_AUDIENCE,
            issuer=settings.OIDC_ISSUER_URL,
            options={"require": ["sub", "exp"]},
        )
        claims = OIDCClaims.model_validate(payload)
        return claims.model_dump()
    except Exception:
        return None


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    tenant_id: str | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    now = datetime.now(UTC)
    to_encode = {
        "sub": subject,
        "exp": now + expires_delta,
        "iat": now,
        "token_type": "access",
    }
    if tenant_id:
        to_encode["tenant_id"] = tenant_id
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str) -> str:
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    now = datetime.now(UTC)
    to_encode = {
        "sub": subject,
        "exp": now + expires_delta,
        "iat": now,
        "token_type": "refresh",
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["sub", "exp", "token_type"]},
        )
        if payload.get("token_type") != "access":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["sub", "exp", "token_type"]},
        )
        if payload.get("token_type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


def create_verification_token(email: str) -> str:
    expires_delta = timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)
    now = datetime.now(UTC)
    to_encode = {
        "sub": email,
        "exp": now + expires_delta,
        "iat": now,
        "token_type": "email_verify",
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_reset_token(email: str) -> str:
    expires_delta = timedelta(hours=settings.RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(UTC)
    to_encode = {
        "sub": email,
        "exp": now + expires_delta,
        "iat": now,
        "token_type": "password_reset",
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_verification_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["sub", "exp", "token_type"]},
        )
        if payload.get("token_type") != "email_verify":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def decode_reset_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["sub", "exp", "token_type"]},
        )
        if payload.get("token_type") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None
