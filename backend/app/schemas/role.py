from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RoleCreate(BaseModel):
    name: str
    description: str = ""
    permissions: list[str] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[str] | None = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    is_system_role: bool
    permissions: list[str]
    created_at: datetime
