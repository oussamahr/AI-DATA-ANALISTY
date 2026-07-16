import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Uuid

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Invitation(Base, TimestampMixin):
    __tablename__ = "invitations"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False)
    role_id = Column(Uuid(), ForeignKey("roles.id"), nullable=True)
    tenant_id = Column(Uuid(), ForeignKey("tenants.id"), nullable=False)
    invited_by_id = Column(Uuid(), ForeignKey("users.id"), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_accepted = Column(Boolean, default=False)
