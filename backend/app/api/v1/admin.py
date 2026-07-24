from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_admin
from app.core.security.audit import audit_logger
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    users = result.scalars().all()
    await audit_logger.read("user", "all", str(current_user.id))
    return users


@router.get("/stats")
async def admin_stats(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
):
    user_count = await db.scalar(select(func.count()).select_from(User))
    tenant_count = await db.scalar(select(func.count()).select_from(Tenant))
    return {
        "total_users": user_count or 0,
        "total_tenants": tenant_count or 0,
    }


@router.post("/users/{user_id}/verify", response_model=UserResponse)
async def verify_user(
    user_id: str,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
):
    """Admin endpoint to manually verify a user's email."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        from app.core.security.exceptions import AppException
        raise AppException("User not found", 404)
    user.is_verified = True
    await db.flush()
    await audit_logger.update("user", user_id, str(current_user.id), details={"action": "verify_email"})
    return user
