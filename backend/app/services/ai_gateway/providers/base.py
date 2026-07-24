"""
Base interfaces for AI providers.

All providers must implement the AIProvider interface to ensure
consistent behavior across different AI services.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncGenerator, Optional
from uuid import UUID


class ProviderType(str, Enum):
    """Supported AI provider types."""

    OPENAI = "openai"
    GEMINI = "gemini"
    GROQ = "groq"
    OPENROUTER = "openrouter"
    ANTHROPIC = "anthropic"
    DEEPSEEK = "deepseek"


class MessageRole(str, Enum):
    """Chat message roles."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class ChatMessage:
    """Chat message structure."""

    role: MessageRole
    content: str
    name: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_calls: Optional[list["ToolCall"]] = None

    def __getitem__(self, key: str):
        return self.to_dict()[key]

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for provider APIs."""
        result = {"role": self.role.value, "content": self.content}
        if self.name:
            result["name"] = self.name
        if self.tool_call_id:
            result["tool_call_id"] = self.tool_call_id
        if self.tool_calls:
            result["tool_calls"] = [tc.to_dict() for tc in self.tool_calls]
        return result


@dataclass
class ToolCall:
    """Tool/function call structure."""

    id: str
    name: str
    arguments: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "function",
            "function": {"name": self.name, "arguments": self.arguments},
        }


@dataclass
class VisionInput:
    """Vision/multimodal input."""

    type: str = "image_url"
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    detail: str = "auto"  # low, high, auto


@dataclass
class GenerationConfig:
    """Generation configuration parameters."""

    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 1.0
    top_k: int = 0
    stop_sequences: list[str] = field(default_factory=list)
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0
    response_format: Optional[dict[str, Any]] = None
    seed: Optional[int] = None


@dataclass
class ChatResponse:
    """Chat completion response."""

    content: str
    model: str
    provider: ProviderType
    usage: dict[str, int] = field(default_factory=dict)
    finish_reason: Optional[str] = None
    tool_calls: list[ToolCall] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class StreamChunk:
    """Streaming response chunk."""

    content: str
    model: str
    provider: ProviderType
    is_final: bool = False
    finish_reason: Optional[str] = None
    tool_calls: list[ToolCall] = field(default_factory=list)
    usage: Optional[dict[str, int]] = None


@dataclass
class EmbeddingResponse:
    """Embedding response."""

    embeddings: list[list[float]]
    model: str
    provider: ProviderType
    usage: dict[str, int] = field(default_factory=dict)


@dataclass
class AIProviderConfig:
    """Provider configuration."""

    provider_type: ProviderType
    api_key: str
    base_url: Optional[str] = None
    default_model: str = ""
    available_models: list[str] = field(default_factory=list)
    supports_streaming: bool = True
    supports_tools: bool = True
    supports_vision: bool = False
    supports_embeddings: bool = False
    max_tokens: int = 4096
    timeout: float = 60.0
    extra_headers: dict[str, str] = field(default_factory=dict)
    extra_params: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Set smart defaults based on provider type."""
        # Vision support
        if self.provider_type in [ProviderType.OPENAI, ProviderType.GEMINI, ProviderType.OPENROUTER, ProviderType.ANTHROPIC]:
            self.supports_vision = True
        elif self.provider_type in [ProviderType.GROQ, ProviderType.DEEPSEEK]:
            self.supports_vision = False

        # Embeddings support
        if self.provider_type in [ProviderType.OPENAI, ProviderType.GEMINI, ProviderType.OPENROUTER]:
            self.supports_embeddings = True
        elif self.provider_type in [ProviderType.GROQ, ProviderType.ANTHROPIC, ProviderType.DEEPSEEK]:
            self.supports_embeddings = False

        # Tools support
        if self.provider_type in [ProviderType.OPENAI, ProviderType.GEMINI, ProviderType.GROQ, ProviderType.OPENROUTER, ProviderType.ANTHROPIC, ProviderType.DEEPSEEK]:
            self.supports_tools = True


class AIProvider(ABC):
    """
    Abstract base class for AI providers.

    All providers must implement this interface to ensure
    consistent behavior across different AI services.
    """

    def __init__(self, config: AIProviderConfig):
        self.config = config
        self._client: Any = None

    @property
    @abstractmethod
    def provider_type(self) -> ProviderType:
        """Return the provider type."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Return the default model for this provider."""
        pass

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the provider client."""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close the provider client and clean up resources."""
        pass

    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> ChatResponse:
        """
        Generate a chat completion.

        Args:
            messages: List of chat messages
            config: Generation configuration
            tools: Available tools/functions

        Returns:
            ChatResponse with the generated content
        """
        pass

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Stream a chat completion.

        Args:
            messages: List of chat messages
            config: Generation configuration
            tools: Available tools/functions

        Yields:
            StreamChunk objects
        """
        pass

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
    ) -> ChatResponse:
        """
        Generate text completion (legacy/completion endpoint).

        Args:
            prompt: Input prompt
            config: Generation configuration

        Returns:
            ChatResponse with generated content
        """
        pass

    async def embeddings(
        self,
        texts: list[str],
        model: Optional[str] = None,
    ) -> EmbeddingResponse:
        """
        Generate embeddings for texts.

        Args:
            texts: List of texts to embed
            model: Embedding model to use

        Returns:
            EmbeddingResponse with embeddings
        """
        raise NotImplementedError("Embeddings not supported by this provider")

    async def vision(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
        config: Optional[GenerationConfig] = None,
    ) -> ChatResponse:
        """
        Generate response with vision/multimodal input.

        Args:
            messages: List of chat messages
            images: List of vision inputs
            config: Generation configuration

        Returns:
            ChatResponse with generated content
        """
        raise NotImplementedError("Vision not supported by this provider")

    async def count_tokens(self, messages: list[ChatMessage]) -> int:
        """
        Count tokens in messages.

        Args:
            messages: List of chat messages

        Returns:
            Token count
        """
        # Default rough estimation
        total_chars = sum(len(m.content) for m in messages)
        return total_chars // 4

    def validate_config(self) -> bool:
        """Validate provider configuration."""
        return bool(self.config.api_key)

    def get_available_models(self) -> list[str]:
        """Get list of available models."""
        return self.config.available_models or [self.default_model]

    def supports_model(self, model: str) -> bool:
        """Check if model is supported."""
        available = self.get_available_models()
        return model in available or not available

    async def health_check(self) -> bool:
        """Check if provider is healthy."""
        try:
            response = await self.chat(
                messages=[ChatMessage(role=MessageRole.USER, content="ping")],
                config=GenerationConfig(max_tokens=5, temperature=0),
            )
            return bool(response.content)
        except Exception:
            return False