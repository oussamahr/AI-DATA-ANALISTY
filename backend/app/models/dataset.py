import uuid

from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class Dataset(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "datasets"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    file_path = Column(String(1024), nullable=False)
    file_size_bytes = Column(BigInteger, default=0)
    mime_type = Column(String(100), default="")
    row_count = Column(BigInteger, nullable=True)
    column_definitions = Column(Text, default="{}")
    contains_pii = Column(Boolean, default=False)
    parent_id = Column(Uuid(), nullable=True)
    owner_id = Column(Uuid(), ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Uuid(), ForeignKey("tenants.id"), nullable=False)

    owner = relationship("User", lazy="selectin")
    tenant = relationship("Tenant", back_populates="datasets", lazy="selectin")
