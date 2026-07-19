"""
Conversation Memory Manager - Handles persistence and retrieval of AI conversations.

Provides per-dataset conversation history with automatic summarization.
"""

import base64
import json
import logging
from datetime import datetime, UTC
from typing import Any, Optional
from uuid import UUID, uuid4

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.models.conversation import ConversationModel, ConversationMessageModel
from app.models.dataset import Dataset
from app.models.user import User
from app.services.ai_gateway.memory.models import (
    Conversation,
    ConversationMessage,
    ConversationSummary,
    ConversationStatus,
    MessageRole,
)

logger = logging.getLogger("ai_gateway.memory")


class ConversationEncryption:
    """Handles encryption/decryption of conversation content using AES-GCM."""

    def __init__(self, master_key: Optional[bytes] = None):
        if master_key is None:
            # Derive key from settings.SECRET_KEY
            import hashlib
            key_material = settings.SECRET_KEY.encode() if isinstance(settings.SECRET_KEY, str) else settings.SECRET_KEY
            self._key = hashlib.sha256(key_material).digest()[:32]
        else:
            self._key = master_key
        self._cipher = AESGCM(self._key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext and return base64-encoded ciphertext with nonce."""
        if not plaintext:
            return ""
        nonce = base64.urlsafe_b64encode(os.urandom(12)).decode()
        ciphertext = self._cipher.encrypt(
            base64.urlsafe_b64decode(nonce),
            plaintext.encode("utf-8"),
            None
        )
        # Store as: nonce:ciphertext
        return f"{nonce}:{base64.urlsafe_b64encode(ciphertext).decode()}"

    def decrypt(self, encrypted: str) -> str:
        """Decrypt base64-encoded ciphertext with nonce."""
        if not encrypted or ":" not in encrypted:
            return encrypted  # Return as-is if not encrypted (backward compatibility)
        try:
            nonce_b64, ciphertext_b64 = encrypted.split(":", 1)
            nonce = base64.urlsafe_b64decode(nonce_b64)
            ciphertext = base64.urlsafe_b64decode(ciphertext_b64)
            plaintext = self._cipher.decrypt(nonce, ciphertext, None)
            return plaintext.decode("utf-8")
        except Exception as e:
            logger.warning(f"Decryption failed, returning raw: {e}")
            return encrypted

    def encrypt_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        """Encrypt sensitive fields in a dict."""
        encrypted = data.copy()
        sensitive_fields = ["content", "system_prompt", "dataset_context", "sql_query"]
        for field in sensitive_fields:
            if field in encrypted and isinstance(encrypted[field], str):
                encrypted[field] = self.encrypt(encrypted[field])
        return encrypted

    def decrypt_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        """Decrypt sensitive fields in a dict."""
        decrypted = data.copy()
        sensitive_fields = ["content", "system_prompt", "dataset_context", "sql_query"]
        for field in sensitive_fields:
            if field in decrypted and isinstance(decrypted[field], str):
                decrypted[field] = self.decrypt(decrypted[field])
        return decrypted


# Global encryption instance
_encryption: Optional[ConversationEncryption] = None


def get_conversation_encryption() -> ConversationEncryption:
    """Get or create the global conversation encryption instance."""
    global _encryption
    if _encryption is None:
        _encryption = ConversationEncryption()
    return _encryption


import os
import hashlib
import base64


class ConversationMemory:
    """
    Manages conversation history for datasets.

    Features:
    - Per-dataset conversation threads
    - Automatic message persistence
    - Conversation summarization
    - Context injection for continued conversations
    - Multi-tenant isolation
    """

    def __init__(self, db: AsyncSession = None):
        self.db = db

    async def _get_db(self) -> AsyncSession:
        """Get database session."""
        if self.db:
            return self.db
        async for session in get_session():
            return session
        raise RuntimeError("No database session available")

    def _model_to_conversation(self, model: ConversationModel) -> Conversation:
        """Convert database model to domain model."""
        return Conversation(
            id=model.id,
            dataset_id=model.dataset_id,
            user_id=model.user_id,
            tenant_id=model.tenant_id,
            title=model.title,
            status=model.status,
            system_prompt=model.system_prompt,
            dataset_context=model.dataset_context,
            message_count=model.message_count,
            total_tokens=model.total_tokens,
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_message_at=model.last_message_at,
        )

    def _model_to_message(self, model: ConversationMessageModel) -> ConversationMessage:
        """Convert database model to domain model with decryption."""
        encryption = get_conversation_encryption()
        return ConversationMessage(
            id=model.id,
            conversation_id=model.conversation_id,
            role=model.role,
            content=encryption.decrypt(model.content),
            model=model.model,
            provider=model.provider,
            tokens_prompt=model.tokens_prompt,
            tokens_completion=model.tokens_completion,
            duration_ms=model.duration_ms,
            tool_calls=model.tool_calls or [],
            tool_call_id=model.tool_call_id,
            dataset_id=model.dataset_id,
            chart_data=model.chart_data,
            sql_query=encryption.decrypt(model.sql_query) if model.sql_query else None,
            created_at=model.created_at,
        )

    # Conversation management

    async def create_conversation(
        self,
        dataset_id: UUID,
        user: User,
        title: Optional[str] = None,
        system_prompt: Optional[str] = None,
        dataset_context: Optional[str] = None,
    ) -> Conversation:
        """Create a new conversation for a dataset."""
        db = await self._get_db()

        # Verify dataset access
        result = await db.execute(
            select(Dataset).where(Dataset.id == dataset_id, Dataset.is_deleted == False)
        )
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise ValueError("Dataset not found")
        if user.tenant_id and dataset.tenant_id != user.tenant_id:
            raise ValueError("Access denied")

        conversation_model = ConversationModel(
            id=uuid4(),
            dataset_id=dataset_id,
            user_id=user.id,
            tenant_id=user.tenant_id,
            title=title or f"Conversation {datetime.now(UTC).strftime('%Y-%m-%d %H:%M')}",
            system_prompt=system_prompt,
            dataset_context=dataset_context,
        )

        db.add(conversation_model)
        await db.flush()

        return self._model_to_conversation(conversation_model)

    async def get_conversation(
        self,
        conversation_id: UUID,
        user: User,
    ) -> Optional[Conversation]:
        """Get a conversation by ID."""
        db = await self._get_db()
        result = await db.execute(
            select(ConversationModel).where(
                ConversationModel.id == conversation_id,
                ConversationModel.user_id == user.id,
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        return self._model_to_conversation(model)

    async def list_conversations(
        self,
        dataset_id: UUID,
        user: User,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ConversationSummary]:
        """List conversations for a dataset."""
        db = await self._get_db()
        result = await db.execute(
            select(ConversationModel)
            .where(
                ConversationModel.dataset_id == dataset_id,
                ConversationModel.user_id == user.id,
                ConversationModel.status != ConversationStatus.DELETED,
            )
            .order_by(ConversationModel.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        models = result.scalars().all()

        summaries = []
        for model in models:
            # Get last message preview
            last_msg_result = await db.execute(
                select(ConversationMessageModel)
                .where(ConversationMessageModel.conversation_id == model.id)
                .order_by(ConversationMessageModel.created_at.desc())
                .limit(1)
            )
            last_msg = last_msg_result.scalar_one_or_none()

            summaries.append(ConversationSummary(
                id=model.id,
                dataset_id=model.dataset_id,
                dataset_name="",  # Would need join
                title=model.title,
                message_count=model.message_count,
                total_tokens=model.total_tokens,
                last_message_preview=last_msg.content[:200] if last_msg else "",
                last_message_at=last_msg.created_at if last_msg else model.updated_at,
                created_at=model.created_at,
                updated_at=model.updated_at,
            ))

        return summaries

    async def delete_conversation(
        self,
        conversation_id: UUID,
        user: User,
    ) -> bool:
        """Delete a conversation (soft delete)."""
        db = await self._get_db()
        result = await db.execute(
            select(ConversationModel).where(
                ConversationModel.id == conversation_id,
                ConversationModel.user_id == user.id,
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            return False

        model.status = ConversationStatus.DELETED
        model.updated_at = datetime.now(UTC)
        await db.flush()
        return True

    async def archive_conversation(
        self,
        conversation_id: UUID,
        user: User,
    ) -> bool:
        """Archive a conversation."""
        db = await self._get_db()
        result = await db.execute(
            select(ConversationModel).where(
                ConversationModel.id == conversation_id,
                ConversationModel.user_id == user.id,
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            return False

        model.status = ConversationStatus.ARCHIVED
        model.updated_at = datetime.now(UTC)
        await db.flush()
        return True

    # Message management

    async def add_message(
        self,
        conversation_id: UUID,
        role: MessageRole,
        content: str,
        user: User,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        tokens_prompt: int = 0,
        tokens_completion: int = 0,
        duration_ms: int = 0,
        tool_calls: Optional[list[dict[str, Any]]] = None,
        tool_call_id: Optional[str] = None,
        dataset_id: Optional[UUID] = None,
        chart_data: Optional[dict[str, Any]] = None,
        sql_query: Optional[str] = None,
    ) -> ConversationMessage:
        """Add a message to a conversation with encryption for sensitive fields."""
        db = await self._get_db()

        # Verify conversation ownership
        conv_result = await db.execute(
            select(ConversationModel).where(
                ConversationModel.id == conversation_id,
                ConversationModel.user_id == user.id,
            )
        )
        conv_model = conv_result.scalar_one_or_none()
        if not conv_model:
            raise ValueError("Conversation not found or access denied")

        # Encrypt sensitive fields
        encryption = get_conversation_encryption()
        encrypted_content = encryption.encrypt(content)
        encrypted_sql = encryption.encrypt(sql_query) if sql_query else None

        message_model = ConversationMessageModel(
            id=uuid4(),
            conversation_id=conversation_id,
            role=role,
            content=encrypted_content,
            model=model,
            provider=provider,
            tokens_prompt=tokens_prompt,
            tokens_completion=tokens_completion,
            duration_ms=duration_ms,
            tool_calls=tool_calls or [],
            tool_call_id=tool_call_id,
            dataset_id=dataset_id,
            chart_data=chart_data,
            sql_query=encrypted_sql,
            created_at=datetime.now(UTC),
        )

        db.add(message_model)

        # Update conversation stats
        conv_model.message_count += 1
        conv_model.total_tokens += tokens_prompt + tokens_completion
        conv_model.last_message_at = datetime.now(UTC)
        conv_model.updated_at = datetime.now(UTC)

        await db.flush()

        return self._model_to_message(message_model)

    async def get_messages(
        self,
        conversation_id: UUID,
        user: User,
        limit: int = 100,
        offset: int = 0,
        include_system: bool = True,
    ) -> list[ConversationMessage]:
        """Get messages for a conversation."""
        db = await self._get_db()

        # Verify conversation ownership
        conv_result = await db.execute(
            select(ConversationModel).where(
                ConversationModel.id == conversation_id,
                ConversationModel.user_id == user.id,
            )
        )
        conv_model = conv_result.scalar_one_or_none()
        if not conv_model:
            return []

        query = (
            select(ConversationMessageModel)
            .where(ConversationMessageModel.conversation_id == conversation_id)
            .order_by(ConversationMessageModel.created_at.asc())
            .offset(offset)
            .limit(limit)
        )

        if not include_system:
            query = query.where(ConversationMessageModel.role != MessageRole.SYSTEM)

        result = await db.execute(query)
        models = result.scalars().all()

        return [self._model_to_message(m) for m in models]

    async def get_recent_messages(
        self,
        conversation_id: UUID,
        user: User,
        count: int = 20,
    ) -> list[ConversationMessage]:
        """Get recent messages for context injection."""
        db = await self._get_db()

        # Verify conversation ownership
        conv_result = await db.execute(
            select(ConversationModel).where(
                ConversationModel.id == conversation_id,
                ConversationModel.user_id == user.id,
            )
        )
        conv_model = conv_result.scalar_one_or_none()
        if not conv_model:
            return []

        result = await db.execute(
            select(ConversationMessageModel)
            .where(ConversationMessageModel.conversation_id == conversation_id)
            .order_by(ConversationMessageModel.created_at.desc())
            .limit(count)
        )
        models = result.scalars().all()

        # Return in chronological order
        return [self._model_to_message(m) for m in reversed(models)]

    # Context building

    def build_context_messages(
        self,
        conversation_id: UUID,
        messages: list[ConversationMessage],
        max_tokens: int = 8000,
        include_system: bool = True,
    ) -> list[ConversationMessage]:
        """
        Build context messages for continued conversation.

        Truncates to fit within token limit, keeping system prompt and recent messages.
        """
        if not messages:
            return []

        # Separate system messages
        system_messages = [m for m in messages if m.role == MessageRole.SYSTEM]
        other_messages = [m for m in messages if m.role != MessageRole.SYSTEM]

        # Estimate tokens (rough: 4 chars = 1 token)
        def estimate_tokens(msg: ConversationMessage) -> int:
            return (len(msg.content) + len(str(msg.tool_calls))) // 4

        # Keep system messages if requested
        result = []
        total_tokens = 0

        if include_system:
            for msg in system_messages:
                tokens = estimate_tokens(msg)
                if total_tokens + tokens <= max_tokens:
                    result.append(msg)
                    total_tokens += tokens

        # Add recent messages in reverse chronological order (newest first)
        # Then reverse to get chronological order
        recent = []
        for msg in reversed(other_messages):
            tokens = estimate_tokens(msg)
            if total_tokens + tokens <= max_tokens:
                recent.append(msg)
                total_tokens += tokens
            else:
                break

        # Reverse to get chronological order
        result.extend(reversed(recent))
        return result

    async def get_conversation_context(
        self,
        conversation_id: UUID,
        user: User,
        max_tokens: int = 8000,
    ) -> list[ConversationMessage]:
        """Get formatted context messages for a conversation."""
        messages = await self.get_recent_messages(conversation_id, user, count=50)
        return self.build_context_messages(conversation_id, messages, max_tokens)

    # Summarization

    async def summarize_conversation(
        self,
        conversation_id: UUID,
        user: User,
        max_length: int = 500,
    ) -> Optional[str]:
        """Generate a summary of the conversation."""
        messages = await self.get_messages(conversation_id, user, limit=100)
        if not messages:
            return None

        # Build summary from key messages
        summary_parts = []
        for msg in messages:
            if msg.role in [MessageRole.USER, MessageRole.ASSISTANT]:
                preview = msg.content[:200]
                summary_parts.append(f"{msg.role.value}: {preview}")

        summary = "\n".join(summary_parts[-10:])  # Last 10 exchanges
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."

        return summary

    # Analytics

    async def get_conversation_stats(
        self,
        conversation_id: UUID,
        user: User,
    ) -> dict[str, Any]:
        """Get statistics for a conversation."""
        messages = await self.get_messages(conversation_id, user)

        total_tokens = sum(m.tokens_prompt + m.tokens_completion for m in messages)
        user_messages = [m for m in messages if m.role == MessageRole.USER]
        assistant_messages = [m for m in messages if m.role == MessageRole.ASSISTANT]

        return {
            "total_messages": len(messages),
            "user_messages": len(user_messages),
            "assistant_messages": len(assistant_messages),
            "total_tokens": total_tokens,
            "total_prompt_tokens": sum(m.tokens_prompt for m in messages),
            "total_completion_tokens": sum(m.tokens_completion for m in messages),
            "avg_duration_ms": sum(m.duration_ms for m in messages) / len(messages) if messages else 0,
            "models_used": list(set(m.model for m in messages if m.model)),
            "providers_used": list(set(m.provider for m in messages if m.provider)),
            "has_tool_calls": any(m.tool_calls for m in messages),
            "has_charts": any(m.chart_data for m in messages),
            "has_sql": any(m.sql_query for m in messages),
        }

    # Export/Import

    async def export_conversation(
        self,
        conversation_id: UUID,
        user: User,
        format: str = "json",
    ) -> str:
        """Export conversation in specified format."""
        conversation = await self.get_conversation(conversation_id, user)
        if not conversation:
            raise ValueError("Conversation not found")

        messages = await self.get_messages(conversation_id, user)

        data = {
            "conversation": conversation.to_dict(),
            "messages": [m.to_dict() for m in messages],
            "exported_at": datetime.now(UTC).isoformat(),
        }

        if format == "json":
            return json.dumps(data, indent=2)
        elif format == "markdown":
            lines = [f"# {conversation.title}", ""]
            for msg in messages:
                lines.append(f"## {msg.role.value.title()}")
                lines.append(msg.content)
                lines.append("")
            return "\n".join(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")


# Global memory instance
_memory: Optional[ConversationMemory] = None


def get_conversation_memory() -> ConversationMemory:
    """Get or create the global conversation memory instance."""
    global _memory
    if _memory is None:
        _memory = ConversationMemory()
    return _memory