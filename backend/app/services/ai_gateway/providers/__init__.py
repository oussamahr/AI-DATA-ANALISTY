"""
AI Provider implementations.

This module exports all available AI providers for the AI Gateway.
"""

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

# Provider implementations
from app.services.ai_gateway.providers.openai_provider import OpenAIProvider
from app.services.ai_gateway.providers.gemini_provider import GeminiProvider
from app.services.ai_gateway.providers.groq_provider import GroqProvider
from app.services.ai_gateway.providers.openrouter_provider import OpenRouterProvider
from app.services.ai_gateway.providers.anthropic_provider import AnthropicProvider
from app.services.ai_gateway.providers.deepseek_provider import DeepSeekProvider

# Provider registry for dynamic loading
PROVIDER_CLASSES = {
    ProviderType.OPENAI: OpenAIProvider,
    ProviderType.GEMINI: GeminiProvider,
    ProviderType.GROQ: GroqProvider,
    ProviderType.OPENROUTER: OpenRouterProvider,
    ProviderType.ANTHROPIC: AnthropicProvider,
    ProviderType.DEEPSEEK: DeepSeekProvider,
}

# Default provider priority order (as specified in requirements)
DEFAULT_PROVIDER_PRIORITY = [
    ProviderType.GEMINI,
    ProviderType.GROQ,
    ProviderType.OPENROUTER,
    ProviderType.OPENAI,
    ProviderType.ANTHROPIC,
    ProviderType.DEEPSEEK,
]

__all__ = [
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
    "OpenAIProvider",
    "GeminiProvider",
    "GroqProvider",
    "OpenRouterProvider",
    "AnthropicProvider",
    "DeepSeekProvider",
    "PROVIDER_CLASSES",
    "DEFAULT_PROVIDER_PRIORITY",
]