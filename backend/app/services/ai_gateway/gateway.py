"""
AI Gateway - Main entry point for all AI operations.

This is the single interface that business services use to interact with AI.
The gateway handles provider selection, fallback, and provides a unified API.
"""

import logging
from typing import Any, AsyncGenerator, Optional
from uuid import UUID

from app.services.ai_gateway.providers.base import (
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
from app.services.ai_gateway.providers.manager import ProviderManager, get_provider_manager

logger = logging.getLogger("ai_gateway")


class AIGateway:
    """
    AI Gateway - Unified interface for all AI operations.

    Business services should only use this gateway, never directly
    instantiate providers. The gateway handles:
    - Provider selection and fallback
    - Model selection
    - Streaming
    - Tool calling
    - Vision
    - Embeddings
    """

    def __init__(
        self,
        provider_manager: Optional[ProviderManager] = None,
        default_config: Optional[GenerationConfig] = None,
    ):
        self.provider_manager = provider_manager or get_provider_manager()
        self.default_config = default_config or GenerationConfig()
        self._system_prompts: dict[str, str] = {}
        self._prompt_templates: dict[str, str] = {}

    def register_system_prompt(self, name: str, prompt: str) -> None:
        """Register a system prompt by name."""
        self._system_prompts[name] = prompt

    def get_system_prompt(self, name: str) -> Optional[str]:
        """Get a registered system prompt."""
        return self._system_prompts.get(name)

    def register_prompt_template(self, name: str, template: str) -> None:
        """Register a prompt template by name."""
        self._prompt_templates[name] = template

    def get_prompt_template(self, name: str) -> Optional[str]:
        """Get a registered prompt template."""
        return self._prompt_templates.get(name)

    def render_template(self, name: str, **kwargs) -> str:
        """Render a prompt template with variables."""
        template = self._prompt_templates.get(name)
        if not template:
            raise ValueError(f"Template '{name}' not found")
        return template.format(**kwargs)

    # Core chat methods

    async def chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        provider_type: Optional[ProviderType] = None,
        model: Optional[str] = None,
    ) -> ChatResponse:
        """
        Generate a chat completion.

        This is the primary method for AI interactions.
        Automatically handles provider fallback.
        """
        config = config or self.default_config
        return await self.provider_manager.chat(
            messages=messages,
            config=config,
            tools=tools,
            provider_type=provider_type,
            model=model,
        )

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        provider_type: Optional[ProviderType] = None,
        model: Optional[str] = None,
        tenant_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream a chat completion."""
        config = config or self.default_config
        async for chunk in self.provider_manager.stream_chat(
            messages=messages,
            config=config,
            tools=tools,
            provider_type=provider_type,
            model=model,
            tenant_id=tenant_id,
            user_id=user_id,
        ):
            yield chunk

    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        provider_type: Optional[ProviderType] = None,
        system_prompt: Optional[str] = None,
    ) -> ChatResponse:
        """
        Generate a simple text completion.

        Convenience method for single-prompt generation.
        """
        messages = []
        if system_prompt:
            messages.append(ChatMessage(role=MessageRole.SYSTEM, content=system_prompt))
        messages.append(ChatMessage(role=MessageRole.USER, content=prompt))

        return await self.chat(messages=messages, config=config, provider_type=provider_type)

    async def structured_generate(
        self,
        prompt: str,
        response_model: type,
        config: Optional[GenerationConfig] = None,
        provider_type: Optional[ProviderType] = None,
        system_prompt: Optional[str] = None,
    ) -> tuple[Any, ChatResponse]:
        """
        Generate structured output using JSON schema.

        Uses provider's JSON mode or function calling for structured output.
        """
        from pydantic import BaseModel

        if not issubclass(response_model, BaseModel):
            raise ValueError("response_model must be a Pydantic BaseModel")

        schema = response_model.model_json_schema()

        # Configure for structured output
        config = config or self.default_config
        config.response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": response_model.__name__,
                "strict": True,
                "schema": schema,
            },
        }

        messages = []
        if system_prompt:
            messages.append(ChatMessage(role=MessageRole.SYSTEM, content=system_prompt))
        messages.append(ChatMessage(role=MessageRole.USER, content=prompt))

        response = await self.chat(messages=messages, config=config, provider_type=provider_type)

        # Parse response
        import json

        try:
            parsed = response_model.model_validate_json(response.content)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            try:
                start = response.content.index("{")
                end = response.content.rindex("}") + 1
                parsed = response_model.model_validate_json(response.content[start:end])
            except (ValueError, json.JSONDecodeError):
                raise ValueError(f"Failed to parse structured response: {response.content}")

        return parsed, response

    # Embeddings

    async def embeddings(
        self,
        texts: list[str],
        model: Optional[str] = None,
        provider_type: Optional[ProviderType] = None,
    ) -> EmbeddingResponse:
        """Generate embeddings for texts."""
        return await self.provider_manager.embeddings(
            texts=texts,
            model=model,
            provider_type=provider_type,
        )

    async def embed_text(self, text: str, model: Optional[str] = None) -> list[float]:
        """Generate embedding for a single text."""
        response = await self.embeddings([text], model=model)
        return response.embeddings[0] if response.embeddings else []

    # Vision

    async def vision(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
        config: Optional[GenerationConfig] = None,
        provider_type: Optional[ProviderType] = None,
    ) -> ChatResponse:
        """Generate response with vision input."""
        config = config or self.default_config
        return await self.provider_manager.vision(
            messages=messages,
            images=images,
            config=config,
            provider_type=provider_type,
        )

    # Utility methods

    def get_current_provider(self) -> Optional[ProviderType]:
        """Get the currently active provider."""
        return self.provider_manager.get_current_provider()

    def get_available_providers(self) -> list[ProviderType]:
        """Get list of available providers."""
        return self.provider_manager.get_available_providers()

    def get_healthy_providers(self) -> list[ProviderType]:
        """Get list of healthy providers."""
        return self.provider_manager.get_healthy_providers()

    async def health_check(self) -> dict[ProviderType, bool]:
        """Check health of all providers."""
        return await self.provider_manager.health_check_all()

    async def close(self) -> None:
        """Close the gateway and all providers."""
        await self.provider_manager.close()


# Global gateway instance
_gateway: Optional[AIGateway] = None


def get_ai_gateway() -> AIGateway:
    """Get or create the global AI Gateway instance."""
    global _gateway
    if _gateway is None:
        _gateway = AIGateway()
    return _gateway


# Convenience functions for direct use

async def chat(
    messages: list[ChatMessage],
    config: Optional[GenerationConfig] = None,
    tools: Optional[list[dict[str, Any]]] = None,
    provider_type: Optional[ProviderType] = None,
    model: Optional[str] = None,
) -> ChatResponse:
    """Convenience function for chat completion."""
    gateway = get_ai_gateway()
    return await gateway.chat(messages, config, tools, provider_type, model)


async def generate(
    prompt: str,
    config: Optional[GenerationConfig] = None,
    provider_type: Optional[ProviderType] = None,
    system_prompt: Optional[str] = None,
) -> ChatResponse:
    """Convenience function for text generation."""
    gateway = get_ai_gateway()
    return await gateway.generate(prompt, config, provider_type, system_prompt)


async def structured_generate(
    prompt: str,
    response_model: type,
    config: Optional[GenerationConfig] = None,
    provider_type: Optional[ProviderType] = None,
    system_prompt: Optional[str] = None,
) -> tuple[Any, ChatResponse]:
    """Convenience function for structured generation."""
    gateway = get_ai_gateway()
    return await gateway.structured_generate(prompt, response_model, config, provider_type, system_prompt)


async def embeddings(
    texts: list[str],
    model: Optional[str] = None,
    provider_type: Optional[ProviderType] = None,
) -> EmbeddingResponse:
    """Convenience function for embeddings."""
    gateway = get_ai_gateway()
    return await gateway.embeddings(texts, model, provider_type)