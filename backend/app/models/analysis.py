import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class AnalysisRun(Base, TimestampMixin):
    __tablename__ = "analysis_runs"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(Uuid(), ForeignKey("datasets.id"), nullable=False)
    user_id = Column(Uuid(), ForeignKey("users.id"), nullable=False)
    analysis_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    config = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    dataset = relationship("Dataset", lazy="selectin")
    user = relationship("User", lazy="selectin")
    results = relationship(
        "AnalysisResult", back_populates="run", lazy="selectin", cascade="all, delete-orphan"
    )


class AnalysisResult(Base, TimestampMixin):
    __tablename__ = "analysis_results"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    analysis_run_id = Column(Uuid(), ForeignKey("analysis_runs.id"), nullable=False)
    dataset_id = Column(Uuid(), ForeignKey("datasets.id"), nullable=False)
    result_type = Column(String(50), nullable=False)
    column_name = Column(String(255), nullable=True)
    data = Column(JSON, default=dict)
    result_metadata = Column("metadata", JSON, default=dict)

    run = relationship("AnalysisRun", back_populates="results", lazy="selectin")
    dataset = relationship("Dataset", lazy="selectin")


class DataProfile(Base, TimestampMixin):
    __tablename__ = "data_profiles"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(Uuid(), ForeignKey("datasets.id"), nullable=False)
    column_name = Column(String(255), nullable=False)
    dtype = Column(String(50), nullable=False)
    null_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    unique_count = Column(Integer, default=0)
    min_val = Column(String(255), nullable=True)
    max_val = Column(String(255), nullable=True)
    mean = Column(Float, nullable=True)
    median = Column(Float, nullable=True)
    std = Column(Float, nullable=True)
    top_values = Column(JSON, default=list)
    histogram = Column(JSON, default=list)

    dataset = relationship("Dataset", lazy="selectin")
