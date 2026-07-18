"""
Conversation models for AI memory persistence.

Stores conversation history per dataset for continued interactions.
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Uuid, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConversationStatus(str, enum.Enum):
    """Conversation status."""

    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class MessageRole(str, enum.Enum):
    """Conversation message roles."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class ConversationModel(Base):
    """Conversation thread for a dataset."""

    __tablename__ = "conversations"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(Uuid(), ForeignKey("datasets.id"), nullable=False)
    user_id = Column(Uuid(), ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Uuid(), ForeignKey("tenants.id"), nullable=True)
    title = Column(String(255), default="New Conversation")
    status = Column(SQLEnum(ConversationStatus), default=ConversationStatus.ACTIVE)
    system_prompt = Column(Text, nullable=True)
    dataset_context = Column(Text, nullable=True)
    message_count = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    dataset = relationship("Dataset", lazy="selectin")
    user = relationship("User", lazy="selectin")
    tenant = relationship("Tenant", lazy="selectin")
    messages = relationship("ConversationMessageModel", back_populates="conversation", cascade="all, delete-orphan", lazy="selectin")


class ConversationMessageModel(Base):
    """Individual message in a conversation."""

    __tablename__ = "conversation_messages"

    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(Uuid(), ForeignKey("conversations.id"), nullable=False)
    role = Column(SQLEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    model = Column(String(100), nullable=True)
    provider = Column(String(50), nullable=True)
    tokens_prompt = Column(Integer, default=0)
    tokens_completion = Column(Integer, default=0)
    duration_ms = Column(Integer, nullable=True)
    tool_calls = Column(JSON, default=list)
    tool_call_id = Column(String(100), nullable=True)
    dataset_id = Column(Uuid(), ForeignKey("datasets.id"), nullable=True)
    chart_data = Column(JSON, nullable=True)
    sql_query = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    conversation = relationship("ConversationModel", back_populates="messages")
    dataset = relationship("Dataset", lazy="selectin")