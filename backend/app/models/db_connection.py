import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.mixins import TimestampMixin
from app.core.database import Base


class DatabaseConnection(Base, TimestampMixin):
    __tablename__ = "database_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    host = Column(String(512), nullable=False)
    port = Column(String(10), nullable=False, default="5432")
    database_name = Column(String(255), nullable=False)
    schema_name = Column(String(255), nullable=True, default="public")

    encrypted_username = Column(Text, nullable=False)
    encrypted_password = Column(Text, nullable=False)

    status = Column(String(20), nullable=False, default="pending")
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    tenant = relationship("Tenant", backref="database_connections")
    user = relationship("User", backref="database_connections")
