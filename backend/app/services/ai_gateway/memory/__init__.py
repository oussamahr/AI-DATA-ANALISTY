"""
AI Conversation Memory - Per-dataset conversation history.

Enables users to continue conversations about datasets across sessions.
"""

from app.services.ai_gateway.memory.manager import ConversationMemory, get_conversation_memory
from app.services.ai_gateway.memory.models import Conversation, ConversationMessage, ConversationSummary

__all__ = [
    "ConversationMemory",
    "get_conversation_memory",
    "Conversation",
    "ConversationMessage",
    "ConversationSummary",
]