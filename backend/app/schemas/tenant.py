from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class TenantCreate(BaseModel):
    name: str
    domain: str = ""


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    domain: str
    is_active: bool
    storage_quota_bytes: int
    created_at: datetime


class InviteUserRequest(BaseModel):
    email: EmailStr
    role_id: UUID | None = None


class AcceptInviteRequest(BaseModel):
    token: str
    password: str
    first_name: str = ""
    last_name: str = ""


class InvitationCreatedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    token: str
    tenant_id: UUID
    role_id: UUID | None
    is_accepted: bool
    expires_at: datetime


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    tenant_id: UUID
    role_id: UUID | None
    is_accepted: bool
    expires_at: datetime
