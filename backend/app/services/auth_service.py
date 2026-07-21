import uuid
from datetime import UTC, datetime

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security.auth import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    create_verification_token,
    decode_refresh_token,
    decode_reset_token,
    decode_verification_token,
    hash_password,
    verify_password,
)
from app.core.security.exceptions import AppException, UnauthorizedException
from app.core.security.password_validators import validate_password_strength
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.user import UserCreate


class AuthService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def register(self, data: UserCreate) -> User:
        existing = await self.db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise AppException("Email already registered", 409)

        errors = validate_password_strength(data.password)
        if errors:
            raise AppException("; ".join(errors), 400)

        user = User(
            id=uuid.uuid4(),
            email=data.email,
            hashed_password=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            is_verified=False,
        )
        self.db.add(user)
        await self.db.flush()

        tenant_name = f"{data.first_name or 'User'}'s Workspace"
        tenant = Tenant(
            id=uuid.uuid4(),
            name=tenant_name,
            domain=f"{data.email.split('@')[0]}-workspace.example.com",
        )
        self.db.add(tenant)
        await self.db.flush()

        user.tenant_id = tenant.id
        admin_role = await self.db.execute(select(Role).where(Role.name == "admin"))
        admin_role_obj = admin_role.scalar_one_or_none()
        if admin_role_obj:
            user.role_id = admin_role_obj.id
        await self.db.flush()
        return user

    async def login(self, email: str, password: str) -> tuple[str, str, User]:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("Account is inactive")

        user.last_login_at = datetime.now(UTC)

        access_token = create_access_token(
            subject=str(user.id),
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
        )
        refresh_token = create_refresh_token(subject=str(user.id))
        return access_token, refresh_token, user

    async def refresh_token(self, token: str) -> tuple[str, str]:
        payload = decode_refresh_token(token)
        if payload is None:
            raise UnauthorizedException("Invalid or expired refresh token")

        user_id = payload.get("sub")
        result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()

        if user is None or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        new_access = create_access_token(
            subject=str(user.id),
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
        )
        new_refresh = create_refresh_token(subject=str(user.id))
        return new_access, new_refresh

    async def get_verification_token(self, user: User) -> str:
        return create_verification_token(user.email)

    async def verify_email(self, token: str) -> User:
        email = decode_verification_token(token)
        if email is None:
            raise AppException("Invalid or expired verification token", 400)

        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            raise AppException("User not found", 404)
        if user.is_verified:
            raise AppException("Email already verified", 400)

        user.is_verified = True
        await self.db.flush()
        return user

    async def request_password_reset(self, email: str) -> str:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            raise AppException("If that email exists, a reset link has been sent", 200)

        token = create_reset_token(email)
        return token

    async def reset_password(self, token: str, new_password: str) -> User:
        email = decode_reset_token(token)
        if email is None:
            raise AppException("Invalid or expired reset token", 400)

        errors = validate_password_strength(new_password)
        if errors:
            raise AppException("; ".join(errors), 400)

        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            raise AppException("User not found", 404)

        user.hashed_password = hash_password(new_password)
        await self.db.flush()
        return user

    async def update_profile(
        self, user: User, first_name: str | None, last_name: str | None
    ) -> User:
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        await self.db.flush()
        return user

    async def change_password(self, user: User, current_password: str, new_password: str) -> User:
        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedException("Current password is incorrect")

        errors = validate_password_strength(new_password)
        if errors:
            raise AppException("; ".join(errors), 400)

        user.hashed_password = hash_password(new_password)
        await self.db.flush()
        return user
