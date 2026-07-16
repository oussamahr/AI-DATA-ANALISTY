import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(150), default="")
    last_name = Column(String(150), default="")
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role_id = Column(Uuid(), ForeignKey("roles.id"), nullable=True)
    tenant_id = Column(Uuid(), ForeignKey("tenants.id"), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    role = relationship("Role", back_populates="users", lazy="selectin")
    tenant = relationship("Tenant", back_populates="users", lazy="selectin")
