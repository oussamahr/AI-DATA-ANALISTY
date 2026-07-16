import uuid

from sqlalchemy import JSON, Boolean, Column, String, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500), default="")
    is_system_role = Column(Boolean, default=False)
    permissions = Column(JSON, default=list)

    users = relationship("User", back_populates="role", lazy="selectin")
