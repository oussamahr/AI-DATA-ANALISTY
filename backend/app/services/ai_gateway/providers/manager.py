"""
Provider Manager - Handles provider selection, initialization, and automatic fallback.

Implements priority-based provider selection with automatic failover.
"""

import logging
from typing import Any, Optional

from app.core.config import settings
from app.services.ai_gateway.providers.base import (
    AIProvider,
    AIProviderConfig,
    ChatMessage,
    ChatResponse,
    EmbeddingResponse,
    GenerationConfig,
    ProviderType,
    StreamChunk,
)
from app.services.ai_gateway.providers import PROVIDER_CLASSES, DEFAULT_PROVIDER_PRIORITY

logger = logging.getLogger("ai_gateway.provider_manager")


class ProviderManager:
    """
    Manages AI providers with automatic fallback.

    Features:
    - Priority-based provider selection
    - Automatic failover on errors
    - Health checking
    - Provider lifecycle management
    """

    def __init__(
        self,
        provider_priority: Optional[list[ProviderType]] = None,
        provider_configs: Optional[dict[ProviderType, AIProviderConfig]] = None,
    ):
        self.provider_priority = provider_priority or DEFAULT_PROVIDER_PRIORITY
        self.provider_configs = provider_configs or {}
        self._providers: dict[ProviderType, AIProvider] = {}
        self._initialized_providers: set[ProviderType] = set()
        self._current_provider: Optional[ProviderType] = None
        self._healthy_providers: set[ProviderType] = set()

    def _build_provider_config(self, provider_type: ProviderType) -> AIProviderConfig:
        """Build provider configuration from settings."""
        # Map provider types to environment variable names
        api_key_map = {
            ProviderType.OPENAI: settings.LLM_API_KEY if settings.LLM_PROVIDER == "openai" else "",
            ProviderType.GEMINI: getattr(settings, "GEMINI_API_KEY", ""),
            ProviderType.GROQ: getattr(settings, "GROQ_API_KEY", ""),
            ProviderType.OPENROUTER: getattr(settings, "OPENROUTER_API_KEY", ""),
            ProviderType.ANTHROPIC: getattr(settings, "ANTHROPIC_API_KEY", ""),
            ProviderType.DEEPSEEK: getattr(settings, "DEEPSEEK_API_KEY", ""),
        }

        base_url_map = {
            ProviderType.OPENAI: settings.LLM_BASE_URL or None,
            ProviderType.GEMINI: None,
            ProviderType.GROQ: None,
            ProviderType.OPENROUTER: None,
            ProviderType.ANTHROPIC: None,
            ProviderType.DEEPSEEK: None,
        }

        default_model_map = {
            ProviderType.OPENAI: settings.LLM_MODEL,
            ProviderType.GEMINI: "gemini-1.5-flash",
            ProviderType.GROQ: "llama-3.1-70b-versatile",
            ProviderType.OPENROUTER: "google/gemini-2.5-flash",
            ProviderType.ANTHROPIC: "claude-3-5-sonnet-20241022",
            ProviderType.DEEPSEEK: "deepseek-chat",
        }

        available_models_map = {
            ProviderType.OPENAI: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
            ProviderType.GEMINI: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
            ProviderType.GROQ: [
                "llama-3.1-70b-versatile",
                "llama-3.1-8b-instant",
                "mixtral-8x7b-32768",
                "gemma2-9b-it",
                "qwen2.5-72b-instruct",
                "deepseek-r1-distill-llama-70b",
            ],
            ProviderType.OPENROUTER: [
                "google/gemini-2.5-flash",
                "google/gemini-2.5-pro",
                "deepseek/deepseek-chat",
                "deepseek/deepseek-r1",
                "meta-llama/llama-3.3-70b-instruct",
                "qwen/qwen3-72b",
                "mistralai/mistral-large",
                "anthropic/claude-3.5-sonnet",
            ],
            ProviderType.ANTHROPIC: [
                "claude-3-5-sonnet-20241022",
                "claude-3-opus-20240229",
                "claude-3-haiku-20240307",
            ],
            ProviderType.DEEPSEEK: ["deepseek-chat", "deepseek-coder"],
        }

        # Use custom config if provided
        if provider_type in self.provider_configs:
            return self.provider_configs[provider_type]

        api_key = api_key_map.get(provider_type, "")
        if not api_key:
            # Try to get from settings dynamically
            key_attr = f"{provider_type.value.upper()}_API_KEY"
            api_key = getattr(settings, key_attr, "")

        return AIProviderConfig(
            provider_type=provider_type,
            api_key=api_key,
            base_url=base_url_map.get(provider_type),
            default_model=default_model_map.get(provider_type, ""),
            available_models=available_models_map.get(provider_type, []),
            supports_streaming=True,
            supports_tools=provider_type in [ProviderType.OPENAI, ProviderType.GEMINI, ProviderType.GROQ, ProviderType.OPENROUTER, ProviderType.ANTHROPIC, ProviderType.DEEPSEEK],
            supports_vision=provider_type in [ProviderType.OPENAI, ProviderType.GEMINI, ProviderType.OPENROUTER, ProviderType.ANTHROPIC],
            supports_embeddings=provider_type in [ProviderType.OPENAI, ProviderType.GEMINI, ProviderType.OPENROUTER],
            max_tokens=8192,
            timeout=60.0,
        )

    async def initialize_provider(self, provider_type: ProviderType) -> Optional[AIProvider]:
        """Initialize a specific provider."""
        if provider_type in self._initialized_providers:
            return self._providers.get(provider_type)

        config = self._build_provider_config(provider_type)
        if not config.api_key:
            logger.warning(f"Provider {provider_type.value} not configured (no API key)")
            return None

        if provider_type not in PROVIDER_CLASSES:
            logger.error(f"Provider {provider_type.value} not implemented")
            return None

        try:
            provider_class = PROVIDER_CLASSES[provider_type]
            provider = provider_class(config)
            await provider.initialize()

            # Health check
            is_healthy = await provider.health_check()
            if is_healthy:
                self._providers[provider_type] = provider
                self._initialized_providers.add(provider_type)
                self._healthy_providers.add(provider_type)
                logger.info(f"Provider {provider_type.value} initialized and healthy")
                return provider
            else:
                logger.warning(f"Provider {provider_type.value} health check failed")
                await provider.close()
                return None

        except Exception as e:
            logger.error(f"Failed to initialize provider {provider_type.value}: {e}")
            return None

    async def get_provider(self, provider_type: Optional[ProviderType] = None) -> AIProvider:
        """
        Get a working provider with automatic fallback.

        Args:
            provider_type: Specific provider to use (None for auto-selection)

        Returns:
            Initialized and healthy AIProvider

        Raises:
            RuntimeError: If no providers are available
        """
        # If specific provider requested, try it first
        if provider_type:
            provider = await self.initialize_provider(provider_type)
            if provider and provider_type in self._healthy_providers:
                self._current_provider = provider_type
                return provider
            logger.warning(f"Requested provider {provider_type.value} not available, falling back")

        # Try providers in priority order
        for ptype in self.provider_priority:
            if ptype in self._healthy_providers:
                provider = self._providers.get(ptype)
                if provider:
                    self._current_provider = ptype
                    return provider

            # Try to initialize if not already tried
            if ptype not in self._initialized_providers:
                provider = await self.initialize_provider(ptype)
                if provider:
                    self._current_provider = ptype
                    return provider

        raise RuntimeError("No AI providers available. Please configure at least one provider.")

    async def get_provider_for_model(self, model: str) -> AIProvider:
        """Get a provider that supports the specified model."""
        # Check current provider first
        if self._current_provider and self._current_provider in self._providers:
            provider = self._providers[self._current_provider]
            if provider.supports_model(model):
                return provider

        # Search all providers
        for ptype in self.provider_priority:
            if ptype in self._healthy_providers:
                provider = self._providers.get(ptype)
                if provider and provider.supports_model(model):
                    self._current_provider = ptype
                    return provider

            if ptype not in self._initialized_providers:
                provider = await self.initialize_provider(ptype)
                if provider and provider.supports_model(model):
                    self._current_provider = ptype
                    return provider

        # Fallback to any available provider
        return await self.get_provider()

    async def chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        provider_type: Optional[ProviderType] = None,
        model: Optional[str] = None,
    ) -> ChatResponse:
        """
        Generate chat completion with automatic fallback.

        Tries providers in priority order until one succeeds.
        """
        last_error = None

        for attempt in range(len(self.provider_priority)):
            try:
                if model:
                    provider = await self.get_provider_for_model(model)
                else:
                    provider = await self.get_provider(provider_type)

                # Override model if specified
                if model and provider.supports_model(model):
                    original_model = provider.config.default_model
                    provider.config.default_model = model
                    try:
                        return await provider.chat(messages, config, tools)
                    finally:
                        provider.config.default_model = original_model
                else:
                    return await provider.chat(messages, config, tools)

            except Exception as e:
                last_error = e
                current = self._current_provider
                if current:
                    logger.warning(f"Provider {current.value} failed: {e}, trying next provider")
                    self._healthy_providers.discard(current)
                    # Try to reinitialize on next attempt
                    self._initialized_providers.discard(current)
                    if current in self._providers:
                        await self._providers[current].close()
                        del self._providers[current]
                continue

        raise RuntimeError(f"All providers failed. Last error: {last_error}")

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        provider_type: Optional[ProviderType] = None,
        model: Optional[str] = None,
    ):
        """Stream chat completion with automatic fallback."""
        # For streaming, we use the first available provider
        # Fallback during streaming is complex, so we pick the best upfront
        try:
            if model:
                provider = await self.get_provider_for_model(model)
            else:
                provider = await self.get_provider(provider_type)

            if model and provider.supports_model(model):
                original_model = provider.config.default_model
                provider.config.default_model = model
                try:
                    async for chunk in provider.stream_chat(messages, config, tools):
                        yield chunk
                finally:
                    provider.config.default_model = original_model
            else:
                async for chunk in provider.stream_chat(messages, config, tools):
                    yield chunk

        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            raise

    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        provider_type: Optional[ProviderType] = None,
    ) -> ChatResponse:
        """Generate text completion with automatic fallback."""
        return await self.chat(
            messages=[ChatMessage(role="user", content=prompt)],
            config=config,
            provider_type=provider_type,
        )

    async def embeddings(
        self,
        texts: list[str],
        model: Optional[str] = None,
        provider_type: Optional[ProviderType] = None,
    ) -> EmbeddingResponse:
        """Generate embeddings with automatic fallback."""
        last_error = None

        for ptype in self.provider_priority:
            if ptype not in PROVIDER_CLASSES:
                continue

            try:
                if provider_type and ptype != provider_type:
                    continue

                provider = await self.initialize_provider(ptype)
                if not provider:
                    continue

                if not provider.config.supports_embeddings:
                    continue

                return await provider.embeddings(texts, model)

            except Exception as e:
                last_error = e
                logger.warning(f"Embeddings failed for {ptype.value}: {e}")
                continue

        raise RuntimeError(f"All embedding providers failed. Last error: {last_error}")

    async def vision(
        self,
        messages: list[ChatMessage],
        images: list,
        config: Optional[GenerationConfig] = None,
        provider_type: Optional[ProviderType] = None,
    ) -> ChatResponse:
        """Generate vision response with automatic fallback."""
        last_error = None

        for ptype in self.provider_priority:
            try:
                if provider_type and ptype != provider_type:
                    continue

                provider = await self.initialize_provider(ptype)
                if not provider:
                    continue

                if not provider.config.supports_vision:
                    continue

                return await provider.vision(messages, images, config)

            except Exception as e:
                last_error = e
                logger.warning(f"Vision failed for {ptype.value}: {e}")
                continue

        raise RuntimeError(f"All vision providers failed. Last error: {last_error}")

    def get_current_provider(self) -> Optional[ProviderType]:
        """Get the currently active provider."""
        return self._current_provider

    def get_healthy_providers(self) -> list[ProviderType]:
        """Get list of healthy providers."""
        return list(self._healthy_providers)

    def get_available_providers(self) -> list[ProviderType]:
        """Get list of all available (configured) providers."""
        available = []
        for ptype in self.provider_priority:
            config = self._build_provider_config(ptype)
            if config.api_key:
                available.append(ptype)
        return available

    async def close(self) -> None:
        """Close all providers."""
        for provider in self._providers.values():
            try:
                await provider.close()
            except Exception as e:
                logger.error(f"Error closing provider: {e}")
        self._providers.clear()
        self._initialized_providers.clear()
        self._healthy_providers.clear()
        self._current_provider = None

    async def health_check_all(self) -> dict[ProviderType, bool]:
        """Check health of all configured providers."""
        results = {}
        for ptype in self.provider_priority:
            config = self._build_provider_config(ptype)
            if not config.api_key:
                results[ptype] = False
                continue

            if ptype in self._healthy_providers:
                provider = self._providers.get(ptype)
                if provider:
                    results[ptype] = await provider.health_check()
                    if not results[ptype]:
                        self._healthy_providers.discard(ptype)
                else:
                    results[ptype] = False
            else:
                provider = await self.initialize_provider(ptype)
                results[ptype] = provider is not None

        return results


# Global provider manager instance
_provider_manager: Optional[ProviderManager] = None


def get_provider_manager() -> ProviderManager:
    """Get or create the global provider manager."""
    global _provider_manager
    if _provider_manager is None:
        # Get provider priority from settings
        priority_str = getattr(settings, "AI_PROVIDER_PRIORITY", "")
        if priority_str:
            priority = [ProviderType(p.strip()) for p in priority_str.split(",")]
        else:
            priority = DEFAULT_PROVIDER_PRIORITY

        _provider_manager = ProviderManager(provider_priority=priority)
    return _provider_manager