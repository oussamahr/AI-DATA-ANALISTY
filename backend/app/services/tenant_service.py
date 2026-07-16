import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security.auth import hash_password
from app.core.security.exceptions import AppException
from app.models.invitation import Invitation
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate


class TenantService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def create_tenant(self, data: TenantCreate, owner: User) -> Tenant:
        tenant = Tenant(
            id=uuid.uuid4(),
            name=data.name,
            domain=data.domain or f"{data.name.lower().replace(' ', '-')}.example.com",
        )
        self.db.add(tenant)
        await self.db.flush()

        owner.tenant_id = tenant.id
        admin_role = await self.db.execute(select(Role).where(Role.name == "admin"))
        admin_role_obj = admin_role.scalar_one_or_none()
        if admin_role_obj:
            owner.role_id = admin_role_obj.id

        await self.db.flush()
        return tenant

    async def invite_user(
        self,
        email: str,
        tenant_id: uuid.UUID,
        invited_by: User,
        role_id: uuid.UUID | None = None,
    ) -> Invitation:
        existing_user = await self.db.execute(select(User).where(User.email == email))
        user = existing_user.scalar_one_or_none()
        if user and user.tenant_id == tenant_id:
            raise AppException("User already belongs to this tenant", 409)

        existing_invite = await self.db.execute(
            select(Invitation).where(
                Invitation.email == email,
                Invitation.tenant_id == tenant_id,
                Invitation.is_accepted == False,
            )
        )
        if existing_invite.scalar_one_or_none():
            raise AppException("Active invitation already exists for this email", 409)

        token = secrets.token_urlsafe(48)
        invitation = Invitation(
            id=uuid.uuid4(),
            email=email,
            token=token,
            role_id=role_id,
            tenant_id=tenant_id,
            invited_by_id=invited_by.id,
            expires_at=datetime.now(UTC) + timedelta(days=settings.INVITATION_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(invitation)
        await self.db.flush()
        return invitation

    async def accept_invitation(
        self, token: str, password: str, first_name: str, last_name: str
    ) -> User:
        result = await self.db.execute(
            select(Invitation).where(
                Invitation.token == token,
                Invitation.is_accepted == False,
            )
        )
        invitation = result.scalar_one_or_none()
        if invitation is None:
            raise AppException("Invalid or expired invitation", 400)
        expires_at = invitation.expires_at
        if expires_at.tzinfo is not None:
            expires_at = expires_at.replace(tzinfo=None)
        if expires_at < datetime.now(UTC).replace(tzinfo=None):
            raise AppException("Invitation has expired", 400)

        existing = await self.db.execute(select(User).where(User.email == invitation.email))
        user = existing.scalar_one_or_none()
        if user:
            user.tenant_id = invitation.tenant_id
            user.role_id = invitation.role_id
            user.hashed_password = hash_password(password)
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
        else:
            user = User(
                id=uuid.uuid4(),
                email=invitation.email,
                hashed_password=hash_password(password),
                first_name=first_name,
                last_name=last_name,
                tenant_id=invitation.tenant_id,
                role_id=invitation.role_id,
                is_verified=True,
            )
            self.db.add(user)

        invitation.is_accepted = True
        invitation.accepted_at = datetime.now(UTC)
        await self.db.flush()
        return user

    async def list_invitations(self, tenant_id: uuid.UUID) -> list[Invitation]:
        result = await self.db.execute(select(Invitation).where(Invitation.tenant_id == tenant_id))
        return list(result.scalars().all())

    async def revoke_invitation(self, invitation_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(Invitation).where(
                Invitation.id == invitation_id,
                Invitation.tenant_id == tenant_id,
            )
        )
        invitation = result.scalar_one_or_none()
        if invitation is None:
            raise AppException("Invitation not found", 404)
        if invitation.is_accepted:
            raise AppException("Cannot revoke accepted invitation", 400)
        await self.db.delete(invitation)
        await self.db.flush()

    async def get_tenant_members(self, tenant_id: uuid.UUID) -> list[User]:
        result = await self.db.execute(select(User).where(User.tenant_id == tenant_id))
        return list(result.scalars().all())

    async def remove_member(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.tenant_id == tenant_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise AppException("User not found in tenant", 404)
        user.tenant_id = None
        user.role_id = None
        await self.db.flush()
