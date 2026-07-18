"""
AI Gateway - Enterprise-grade AI provider abstraction layer.

This module provides a unified interface for interacting with multiple AI providers
with automatic fallback, provider selection, and consistent API.
"""

from app.services.ai_gateway.gateway import AIGateway, get_ai_gateway
from app.services.ai_gateway.providers.base import (
    AIProvider,
    AIProviderConfig,
    ChatMessage,
    ChatResponse,
    EmbeddingResponse,
    GenerationConfig,
    MessageRole,
    ProviderType,
    StreamChunk,
    ToolCall,
    VisionInput,
)
from app.services.ai_gateway.providers.manager import ProviderManager
from app.services.ai_gateway.memory import ConversationMemory, get_conversation_memory

__all__ = [
    "AIGateway",
    "get_ai_gateway",
    "AIProvider",
    "AIProviderConfig",
    "ChatMessage",
    "ChatResponse",
    "EmbeddingResponse",
    "GenerationConfig",
    "MessageRole",
    "ProviderType",
    "StreamChunk",
    "ToolCall",
    "VisionInput",
    "ProviderManager",
    "ConversationMemory",
    "get_conversation_memory",
]