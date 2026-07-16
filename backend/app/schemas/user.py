from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str = ""
    last_name: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    csrf_token: str | None = None


class TokenRefresh(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    first_name: str
    last_name: str
    is_verified: bool
    is_active: bool
    role_id: UUID | None
    tenant_id: UUID | None
    last_login_at: datetime | None


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageResponse(BaseModel):
    message: str


class OIDCLoginRequest(BaseModel):
    id_token: str


class OIDCProviderConfig(BaseModel):
    issuer: str
    client_id: str
    scopes: str
    audience: str
    auth_mode: str
