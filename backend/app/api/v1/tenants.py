import uuid

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, require_tenant_owner
from app.core.security.audit import audit_logger
from app.core.security.validators import validate_no_html, validate_no_sql_injection
from app.models.user import User
from app.schemas.tenant import (
    AcceptInviteRequest,
    InvitationCreatedResponse,
    InvitationResponse,
    InviteUserRequest,
    TenantCreate,
    TenantResponse,
)
from app.schemas.user import MessageResponse, UserResponse
from app.services.tenant_service import TenantService

router = APIRouter()


@router.post("", response_model=TenantResponse, status_code=201)
async def create_tenant(
    data: TenantCreate,
    current_user: User = Depends(get_current_user),
    tenant_service: TenantService = Depends(),
):
    validate_no_sql_injection(data.name)
    validate_no_html(data.name)
    if data.domain:
        validate_no_sql_injection(data.domain)
        validate_no_html(data.domain)
    tenant = await tenant_service.create_tenant(data, current_user)
    await audit_logger.create("tenant", str(tenant.id), str(current_user.id))
    return tenant


@router.get("/members", response_model=list[UserResponse])
async def list_members(
    current_user: User = Depends(require_tenant_owner),
    tenant_service: TenantService = Depends(),
):
    return await tenant_service.get_tenant_members(current_user.tenant_id)


@router.delete("/members/{user_id}")
async def remove_member(
    user_id: str,
    current_user: User = Depends(require_tenant_owner),
    tenant_service: TenantService = Depends(),
):
    await tenant_service.remove_member(current_user.tenant_id, uuid.UUID(user_id))
    return MessageResponse(message="Member removed successfully")


@router.post("/invitations", response_model=InvitationCreatedResponse, status_code=201)
async def invite_user(
    data: InviteUserRequest,
    current_user: User = Depends(get_current_user),
    tenant_service: TenantService = Depends(),
):
    invitation = await tenant_service.invite_user(
        email=data.email,
        tenant_id=current_user.tenant_id,
        invited_by=current_user,
        role_id=data.role_id,
    )
    await audit_logger.create("invitation", str(invitation.id), str(current_user.id))
    return invitation


@router.get("/invitations", response_model=list[InvitationResponse])
async def list_invitations(
    current_user: User = Depends(get_current_user),
    tenant_service: TenantService = Depends(),
):
    return await tenant_service.list_invitations(current_user.tenant_id)


@router.delete("/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    tenant_service: TenantService = Depends(),
):
    await tenant_service.revoke_invitation(uuid.UUID(invitation_id), current_user.tenant_id)
    return MessageResponse(message="Invitation revoked")


@router.post("/accept-invitation", response_model=UserResponse)
async def accept_invitation(
    data: AcceptInviteRequest,
    tenant_service: TenantService = Depends(),
):
    if data.first_name:
        validate_no_sql_injection(data.first_name)
        validate_no_html(data.first_name)
    if data.last_name:
        validate_no_sql_injection(data.last_name)
        validate_no_html(data.last_name)
    user = await tenant_service.accept_invitation(
        token=data.token,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    return user
