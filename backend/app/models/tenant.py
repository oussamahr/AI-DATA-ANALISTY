import uuid

from sqlalchemy import BigInteger, Boolean, Column, String, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    storage_quota_bytes = Column(BigInteger, default=1073741824)

    users = relationship("User", back_populates="tenant", lazy="selectin")
    datasets = relationship("Dataset", back_populates="tenant", lazy="selectin")
    audit_logs = relationship("AuditLog", back_populates="tenant", lazy="selectin")
