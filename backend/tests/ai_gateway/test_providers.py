"""
Tests for AI Gateway providers.

Tests provider initialization, configuration, and fallback behavior.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.ai_gateway.providers.base import (
    AIProviderConfig,
    ChatMessage,
    GenerationConfig,
    MessageRole,
    ProviderType,
)
from app.services.ai_gateway.providers.openai_provider import OpenAIProvider
from app.services.ai_gateway.providers.gemini_provider import GeminiProvider
from app.services.ai_gateway.providers.groq_provider import GroqProvider
from app.services.ai_gateway.providers.openrouter_provider import OpenRouterProvider
from app.services.ai_gateway.providers.anthropic_provider import AnthropicProvider
from app.services.ai_gateway.providers.deepseek_provider import DeepSeekProvider
from app.services.ai_gateway.providers.manager import ProviderManager, DEFAULT_PROVIDER_PRIORITY


class TestProviderConfig:
    """Test provider configuration."""

    def test_openai_config(self):
        config = AIProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key="test-key",
            default_model="gpt-4o",
        )
        assert config.provider_type == ProviderType.OPENAI
        assert config.api_key == "test-key"
        assert config.default_model == "gpt-4o"
        assert config.supports_streaming is True
        assert config.supports_tools is True

    def test_gemini_config(self):
        config = AIProviderConfig(
            provider_type=ProviderType.GEMINI,
            api_key="test-key",
            default_model="gemini-1.5-flash",
        )
        assert config.provider_type == ProviderType.GEMINI
        assert config.supports_vision is True
        assert config.supports_embeddings is True

    def test_groq_config(self):
        config = AIProviderConfig(
            provider_type=ProviderType.GROQ,
            api_key="test-key",
            default_model="llama-3.3-70b-versatile",
        )
        assert config.provider_type == ProviderType.GROQ
        assert config.supports_embeddings is False
        assert config.supports_vision is False


class TestProviderInitialization:
    """Test provider initialization with mocked clients."""

    @pytest.mark.asyncio
    async def test_openai_provider_init(self):
        config = AIProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key="test-key",
            default_model="gpt-4o",
        )
        provider = OpenAIProvider(config)

        with patch("app.services.ai_gateway.providers.openai_provider.AsyncOpenAI") as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value = mock_instance

            await provider.initialize()
            assert provider._client is not None
            mock_client.assert_called_once_with(
                api_key="test-key",
                base_url=None,
                timeout=60.0,
                default_headers={},
            )

    @pytest.mark.asyncio
    async def test_gemini_provider_init(self):
        config = AIProviderConfig(
            provider_type=ProviderType.GEMINI,
            api_key="test-key",
            default_model="gemini-1.5-flash",
        )
        provider = GeminiProvider(config)

        with patch("app.services.ai_gateway.providers.gemini_provider.genai.Client") as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value = mock_instance

            await provider.initialize()
            assert provider._client is not None
            mock_client.assert_called_once_with(api_key="test-key")

    @pytest.mark.asyncio
    async def test_groq_provider_init(self):
        config = AIProviderConfig(
            provider_type=ProviderType.GROQ,
            api_key="test-key",
            default_model="llama-3.3-70b-versatile",
        )
        provider = GroqProvider(config)

        with patch("groq.AsyncGroq") as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value = mock_instance

            await provider.initialize()
            assert provider._client is not None


class TestMessageConversion:
    """Test message format conversion."""

    def test_openai_message_conversion(self):
        config = AIProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key="test-key",
        )
        provider = OpenAIProvider(config)

        messages = [
            ChatMessage(role=MessageRole.SYSTEM, content="System prompt"),
            ChatMessage(role=MessageRole.USER, content="User message"),
            ChatMessage(role=MessageRole.ASSISTANT, content="Assistant response"),
        ]

        converted = provider._convert_messages(messages)
        assert len(converted) == 3
        assert converted[0]["role"] == "system"
        assert converted[1]["role"] == "user"
        assert converted[2]["role"] == "assistant"

    def test_anthropic_message_conversion(self):
        config = AIProviderConfig(
            provider_type=ProviderType.ANTHROPIC,
            api_key="test-key",
        )
        provider = AnthropicProvider(config)

        messages = [
            ChatMessage(role=MessageRole.SYSTEM, content="System prompt"),
            ChatMessage(role=MessageRole.USER, content="User message"),
            ChatMessage(role=MessageRole.ASSISTANT, content="Assistant response"),
        ]

        system, converted = provider._convert_messages(messages)
        assert system == "System prompt"
        assert len(converted) == 2
        assert converted[0]["role"] == "user"
        assert converted[1]["role"] == "assistant"


class TestProviderManager:
    """Test provider manager fallback logic."""

    @pytest.mark.asyncio
    async def test_provider_priority_order(self):
        """Test that default priority order is correct."""
        manager = ProviderManager()
        assert manager.provider_priority == DEFAULT_PROVIDER_PRIORITY
        assert manager.provider_priority[0] == ProviderType.GEMINI
        assert manager.provider_priority[1] == ProviderType.GROQ
        assert manager.provider_priority[2] == ProviderType.OPENROUTER

    @pytest.mark.asyncio
    async def test_custom_priority(self):
        """Test custom provider priority."""
        custom = [ProviderType.OPENAI, ProviderType.GEMINI]
        manager = ProviderManager(provider_priority=custom)
        assert manager.provider_priority == custom

    @pytest.mark.asyncio
    async def test_get_available_providers(self):
        """Test getting available (configured) providers."""
        manager = ProviderManager()
        # Without API keys, should return empty or only those with keys
        available = manager.get_available_providers()
        # In test environment, no keys are set, so should be empty
        assert isinstance(available, list)


class TestChatMessage:
    """Test chat message dataclass."""

    def test_message_creation(self):
        msg = ChatMessage(role=MessageRole.USER, content="Hello")
        assert msg.role == MessageRole.USER
        assert msg.content == "Hello"
        assert msg.tool_calls is None

    def test_message_to_dict(self):
        msg = ChatMessage(role=MessageRole.USER, content="Hello")
        d = msg.to_dict()
        assert d["role"] == "user"
        assert d["content"] == "Hello"

    def test_tool_call_conversion(self):
        from app.services.ai_gateway.providers.base import ToolCall
        tool_call = ToolCall(id="call_123", name="test_func", arguments={"arg": "value"})
        msg = ChatMessage(
            role=MessageRole.ASSISTANT,
            content="",
            tool_calls=[tool_call],
        )
        d = msg.to_dict()
        assert d["role"] == "assistant"
        assert len(d["tool_calls"]) == 1
        assert d["tool_calls"][0]["function"]["name"] == "test_func"


class TestGenerationConfig:
    """Test generation configuration."""

    def test_default_config(self):
        config = GenerationConfig()
        assert config.temperature == 0.7
        assert config.max_tokens == 4096
        assert config.top_p == 1.0

    def test_custom_config(self):
        config = GenerationConfig(
            temperature=0.5,
            max_tokens=2000,
            top_p=0.9,
            stop_sequences=["STOP"],
        )
        assert config.temperature == 0.5
        assert config.max_tokens == 2000
        assert config.top_p == 0.9
        assert config.stop_sequences == ["STOP"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])