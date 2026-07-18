"""
Memory models for conversation history.

Defines the data structures for conversations, messages, and summaries.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime, UTC
from typing import Any, Optional
from uuid import UUID, uuid4

from app.models.conversation import ConversationStatus, MessageRole


@dataclass
class ConversationMessage:
    """A single message in a conversation."""

    id: UUID = field(default_factory=uuid4)
    conversation_id: UUID = field(default_factory=uuid4)
    role: MessageRole = MessageRole.USER
    content: str = ""
    # Metadata
    model: Optional[str] = None
    provider: Optional[str] = None
    tokens_prompt: int = 0
    tokens_completion: int = 0
    duration_ms: int = 0
    # Tool calls
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    tool_call_id: Optional[str] = None
    # Context
    dataset_id: Optional[UUID] = None
    chart_data: Optional[dict[str, Any]] = None
    sql_query: Optional[str] = None
    # Timestamps
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "id": str(self.id),
            "conversation_id": str(self.conversation_id),
            "role": self.role.value,
            "content": self.content,
            "model": self.model,
            "provider": self.provider,
            "tokens_prompt": self.tokens_prompt,
            "tokens_completion": self.tokens_completion,
            "duration_ms": self.duration_ms,
            "tool_calls": self.tool_calls,
            "tool_call_id": self.tool_call_id,
            "dataset_id": str(self.dataset_id) if self.dataset_id else None,
            "chart_data": self.chart_data,
            "sql_query": self.sql_query,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ConversationMessage":
        """Create from dictionary."""
        return cls(
            id=UUID(data["id"]),
            conversation_id=UUID(data["conversation_id"]),
            role=MessageRole(data["role"]),
            content=data["content"],
            model=data.get("model"),
            provider=data.get("provider"),
            tokens_prompt=data.get("tokens_prompt", 0),
            tokens_completion=data.get("tokens_completion", 0),
            duration_ms=data.get("duration_ms", 0),
            tool_calls=data.get("tool_calls", []),
            tool_call_id=data.get("tool_call_id"),
            dataset_id=UUID(data["dataset_id"]) if data.get("dataset_id") else None,
            chart_data=data.get("chart_data"),
            sql_query=data.get("sql_query"),
            created_at=datetime.fromisoformat(data["created_at"]),
        )


@dataclass
class Conversation:
    """A conversation thread about a dataset."""

    id: UUID = field(default_factory=uuid4)
    dataset_id: UUID = field(default_factory=uuid4)
    user_id: UUID = field(default_factory=uuid4)
    tenant_id: Optional[UUID] = None
    title: str = "New Conversation"
    status: ConversationStatus = ConversationStatus.ACTIVE
    # Context
    system_prompt: Optional[str] = None
    dataset_context: Optional[str] = None  # Serialized dataset profile/summary
    # Statistics
    message_count: int = 0
    total_tokens: int = 0
    # Timestamps
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    last_message_at: Optional[datetime] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "id": str(self.id),
            "dataset_id": str(self.dataset_id),
            "user_id": str(self.user_id),
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "title": self.title,
            "status": self.status.value,
            "system_prompt": self.system_prompt,
            "dataset_context": self.dataset_context,
            "message_count": self.message_count,
            "total_tokens": self.total_tokens,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Conversation":
        """Create from dictionary."""
        return cls(
            id=UUID(data["id"]),
            dataset_id=UUID(data["dataset_id"]),
            user_id=UUID(data["user_id"]),
            tenant_id=UUID(data["tenant_id"]) if data.get("tenant_id") else None,
            title=data["title"],
            status=ConversationStatus(data["status"]),
            system_prompt=data.get("system_prompt"),
            dataset_context=data.get("dataset_context"),
            message_count=data.get("message_count", 0),
            total_tokens=data.get("total_tokens", 0),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            last_message_at=datetime.fromisoformat(data["last_message_at"]) if data.get("last_message_at") else None,
        )


@dataclass
class ConversationSummary:
    """Summary of a conversation for quick listing."""

    id: UUID
    dataset_id: UUID
    dataset_name: str
    title: str
    message_count: int
    total_tokens: int
    last_message_preview: str
    last_message_at: datetime
    created_at: datetime
    updated_at: datetime

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "dataset_id": str(self.dataset_id),
            "dataset_name": self.dataset_name,
            "title": self.title,
            "message_count": self.message_count,
            "total_tokens": self.total_tokens,
            "last_message_preview": self.last_message_preview,
            "last_message_at": self.last_message_at.isoformat(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }