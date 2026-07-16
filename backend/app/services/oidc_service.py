import uuid

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security.auth import (
    create_access_token,
    create_refresh_token,
    decode_oidc_token,
    hash_password,
)
from app.core.security.exceptions import AppException
from app.models.role import Role
from app.models.user import User


class OIDCService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def _resolve_role(self, oidc_claims: dict) -> Role | None:
        if not settings.OIDC_ROLES_CLAIM:
            role_name = settings.OIDC_DEFAULT_ROLE
        else:
            oidc_roles = oidc_claims.get(settings.OIDC_ROLES_CLAIM, [])
            if isinstance(oidc_roles, str):
                oidc_roles = [oidc_roles]
            mapped = [settings.OIDC_ROLE_MAPPING.get(r, r) for r in oidc_roles]
            role_name = mapped[0] if mapped else settings.OIDC_DEFAULT_ROLE

        result = await self.db.execute(select(Role).where(Role.name == role_name))
        role = result.scalar_one_or_none()
        if role is None:
            role = Role(
                id=uuid.uuid4(),
                name=role_name,
                description="Auto-created from OIDC role mapping",
                is_system_role=False,
                permissions=[],
            )
            self.db.add(role)
            await self.db.flush()
        return role

    async def login(self, id_token: str) -> tuple[str, str, User]:
        oidc_claims = await decode_oidc_token(id_token)
        if oidc_claims is None:
            raise AppException("Invalid or expired OIDC token", 401)

        sub = oidc_claims.get(settings.OIDC_SUBJECT_CLAIM) or oidc_claims.get("sub")
        email = oidc_claims.get(settings.OIDC_EMAIL_CLAIM) or oidc_claims.get("email")
        email_verified = oidc_claims.get(settings.OIDC_EMAIL_VERIFIED_CLAIM) or oidc_claims.get(
            "email_verified", False
        )

        if not sub or not email:
            raise AppException("OIDC token missing required claims (sub, email)", 401)

        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is not None:
            if not user.is_active:
                raise AppException("Account is inactive", 401)
            user.is_verified = user.is_verified or bool(email_verified)
            await self.db.flush()
        else:
            if not settings.OIDC_AUTO_PROVISION_USERS:
                raise AppException("User not found. Contact your administrator.", 403)

            role = await self._resolve_role(oidc_claims)

            user = User(
                id=uuid.uuid4(),
                email=email,
                hashed_password=hash_password(uuid.uuid4().hex),
                first_name=oidc_claims.get("given_name", ""),
                last_name=oidc_claims.get("family_name", ""),
                is_verified=bool(email_verified),
                is_active=True,
                role_id=role.id,
            )
            self.db.add(user)
            await self.db.flush()

        access_token = create_access_token(
            subject=str(user.id),
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
        )
        refresh_token = create_refresh_token(subject=str(user.id))
        return access_token, refresh_token, user

    def get_provider_config(self) -> dict:
        return {
            "issuer": settings.OIDC_ISSUER_URL,
            "client_id": settings.OIDC_CLIENT_ID,
            "scopes": settings.OIDC_SCOPES,
            "audience": settings.OIDC_AUDIENCE,
            "auth_mode": settings.AUTH_MODE,
        }
