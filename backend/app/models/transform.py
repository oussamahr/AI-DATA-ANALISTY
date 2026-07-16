import uuid

from sqlalchemy import JSON, Column, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class DataTransform(Base, TimestampMixin):
    __tablename__ = "data_transforms"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(Uuid(), ForeignKey("datasets.id"), nullable=False)
    user_id = Column(Uuid(), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), default="")
    transform_type = Column(String(50), nullable=False)
    config = Column(JSON, default=dict)
    applied_order = Column(Integer, nullable=False)

    dataset = relationship("Dataset", lazy="selectin")
    user = relationship("User", lazy="selectin")
