import uuid

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate

SYSTEM_ROLES = {
    "admin": {
        "description": "Tenant administrator with full access",
        "permissions": [
            "tenant:read",
            "tenant:write",
            "tenant:delete",
            "user:read",
            "user:write",
            "user:delete",
            "dataset:read",
            "dataset:write",
            "dataset:delete",
            "analytics:read",
            "analytics:write",
            "llm:query",
            "llm:admin",
            "invitation:create",
            "invitation:revoke",
            "role:read",
            "role:write",
            "audit:read",
        ],
    },
    "analyst": {
        "description": "Can access datasets and run analytics",
        "permissions": [
            "dataset:read",
            "dataset:write",
            "analytics:read",
            "llm:query",
        ],
    },
    "viewer": {
        "description": "Read-only access to shared datasets",
        "permissions": [
            "dataset:read",
            "analytics:read",
        ],
    },
}


class RoleService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def seed_system_roles(self) -> None:
        for name, cfg in SYSTEM_ROLES.items():
            existing = await self.db.execute(select(Role).where(Role.name == name))
            if not existing.scalar_one_or_none():
                role = Role(
                    id=uuid.uuid4(),
                    name=name,
                    description=cfg["description"],
                    is_system_role=True,
                    permissions=cfg["permissions"],
                )
                self.db.add(role)
        await self.db.flush()

    async def create_role(self, data: RoleCreate) -> Role:
        existing = await self.db.execute(select(Role).where(Role.name == data.name))
        if existing.scalar_one_or_none():
            raise AppException("Role already exists", 409)

        role = Role(
            id=uuid.uuid4(),
            name=data.name,
            description=data.description,
            permissions=data.permissions,
        )
        self.db.add(role)
        await self.db.flush()
        return role

    async def update_role(self, role_id: uuid.UUID, data: RoleUpdate) -> Role:
        role = await self.db.get(Role, role_id)
        if role is None:
            raise AppException("Role not found", 404)
        if role.is_system_role:
            raise AppException("Cannot modify system roles", 403)

        if data.name is not None:
            role.name = data.name
        if data.description is not None:
            role.description = data.description
        if data.permissions is not None:
            role.permissions = data.permissions
        await self.db.flush()
        return role

    async def list_roles(self) -> list[Role]:
        result = await self.db.execute(select(Role).order_by(Role.name))
        return list(result.scalars().all())

    async def get_role(self, role_id: uuid.UUID) -> Role | None:
        return await self.db.get(Role, role_id)

    async def get_db_user(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def assign_role(self, user: User, role_id: uuid.UUID) -> User:
        role = await self.db.get(Role, role_id)
        if role is None:
            raise AppException("Role not found", 404)
        user.role_id = role.id
        await self.db.flush()
        return user
