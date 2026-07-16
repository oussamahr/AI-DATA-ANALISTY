import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class LLMQuery(Base):
    __tablename__ = "llm_queries"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(), ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Uuid(), ForeignKey("tenants.id"), nullable=True)
    prompt = Column(Text, nullable=False)
    prompt_redacted = Column(Text, nullable=True)
    response = Column(Text, nullable=True)
    model = Column(String(100), nullable=False)
    tokens_prompt = Column(Integer, default=0)
    tokens_completion = Column(Integer, default=0)
    duration_ms = Column(Integer, nullable=True)
    cost = Column(Float, default=0.0)
    success = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    user = relationship("User", lazy="selectin")
