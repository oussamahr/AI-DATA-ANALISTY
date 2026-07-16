import uuid

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_admin
from app.core.security.exceptions import AppException
from app.core.security.validators import validate_no_html, validate_no_sql_injection
from app.models.user import User
from app.schemas.role import RoleCreate, RoleResponse, RoleUpdate
from app.schemas.user import UserResponse
from app.services.role_service import RoleService

router = APIRouter()


@router.get("", response_model=list[RoleResponse])
async def list_roles(
    role_service: RoleService = Depends(),
):
    return await role_service.list_roles()


@router.post("", response_model=RoleResponse, status_code=201)
async def create_role(
    data: RoleCreate,
    current_user: User = Depends(get_current_admin),
    role_service: RoleService = Depends(),
):
    validate_no_sql_injection(data.name)
    validate_no_html(data.name)
    if data.description:
        validate_no_sql_injection(data.description)
        validate_no_html(data.description)
    return await role_service.create_role(data)


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    role_service: RoleService = Depends(),
):
    role = await role_service.get_role(uuid.UUID(role_id))
    if role is None:
        raise AppException("Role not found", 404)
    return role


@router.patch("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    current_user: User = Depends(get_current_admin),
    role_service: RoleService = Depends(),
):
    if data.name:
        validate_no_sql_injection(data.name)
        validate_no_html(data.name)
    if data.description:
        validate_no_sql_injection(data.description)
        validate_no_html(data.description)
    return await role_service.update_role(uuid.UUID(role_id), data)


@router.post("/{role_id}/assign/{user_id}", response_model=UserResponse)
async def assign_role(
    role_id: str,
    user_id: str,
    current_user: User = Depends(get_current_admin),
    role_service: RoleService = Depends(),
):
    user_obj = await role_service.get_db_user(uuid.UUID(user_id))
    if user_obj is None:
        raise AppException("User not found", 404)
    await role_service.assign_role(user_obj, uuid.UUID(role_id))
    return user_obj
