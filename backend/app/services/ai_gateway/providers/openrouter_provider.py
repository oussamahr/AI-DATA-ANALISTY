"""
OpenRouter provider implementation.

Supports free and paid models from multiple providers through OpenRouter.
Models: deepseek/deepseek-chat, google/gemini-2.5-flash, meta-llama/llama-3.3,
qwen/qwen3, mistralai/mistral, and many more.
"""

import json
from typing import Any, AsyncGenerator, Optional

from openai import AsyncOpenAI

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


class OpenRouterProvider(AIProvider):
    """OpenRouter API provider for accessing multiple models."""

    def __init__(self, config: AIProviderConfig):
        super().__init__(config)
        self._client: Optional[AsyncOpenAI] = None

    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.OPENROUTER

    @property
    def default_model(self) -> str:
        return self.config.default_model or "google/gemini-2.5-flash"

    async def initialize(self) -> None:
        """Initialize OpenRouter client."""
        self._client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url or "https://openrouter.ai/api/v1",
            timeout=self.config.timeout,
            default_headers={
                "HTTP-Referer": self.config.extra_headers.get("HTTP-Referer", "https://ai-data-analyst.com"),
                "X-Title": self.config.extra_headers.get("X-Title", "AI Data Analyst"),
                **self.config.extra_headers,
            },
        )

    async def close(self) -> None:
        """Close OpenRouter client."""
        if self._client:
            await self._client.close()
            self._client = None

    def _convert_messages(self, messages: list[ChatMessage]) -> list[dict[str, Any]]:
        """Convert internal messages to OpenRouter format (OpenAI compatible)."""
        result = []
        for msg in messages:
            if msg.role == MessageRole.TOOL:
                result.append(
                    {
                        "role": "tool",
                        "content": msg.content,
                        "tool_call_id": msg.tool_call_id,
                    }
                )
            elif msg.tool_calls:
                result.append(
                    {
                        "role": "assistant",
                        "content": msg.content,
                        "tool_calls": [tc.to_dict() for tc in msg.tool_calls],
                    }
                )
            else:
                result.append(msg.to_dict())
        return result

    def _convert_tools(self, tools: Optional[list[dict[str, Any]]]) -> Optional[list[dict[str, Any]]]:
        """Convert tools to OpenRouter format."""
        return tools

    def _convert_vision_messages(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
    ) -> list[dict[str, Any]]:
        """Convert messages with images to OpenRouter vision format."""
        result = []
        for msg in messages:
            if msg.role == MessageRole.USER and images:
                content = []
                if msg.content:
                    content.append({"type": "text", "text": msg.content})
                for img in images:
                    if img.image_url:
                        content.append({"type": "image_url", "image_url": {"url": img.image_url, "detail": img.detail}})
                    elif img.image_base64:
                        content.append(
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{img.image_base64}", "detail": img.detail},
                            }
                        )
                result.append({"role": "user", "content": content})
            else:
                result.append(msg.to_dict())
        return result

    async def chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> ChatResponse:
        """Generate chat completion via OpenRouter."""
        if not self._client:
            await self.initialize()

        config = config or GenerationConfig()
        openrouter_messages = self._convert_messages(messages)
        openrouter_tools = self._convert_tools(tools)

        kwargs = {
            "model": self.config.default_model,
            "messages": openrouter_messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "stop": config.stop_sequences or None,
            "presence_penalty": config.presence_penalty,
            "frequency_penalty": config.frequency_penalty,
            "response_format": config.response_format,
            "seed": config.seed,
        }
        if openrouter_tools:
            kwargs["tools"] = openrouter_tools
            kwargs["tool_choice"] = "auto"

        response = await self._client.chat.completions.create(**kwargs)

        choice = response.choices[0]
        tool_calls = []
        if choice.message.tool_calls:
            for tc in choice.message.tool_calls:
                tool_calls.append(
                    ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        arguments=json.loads(tc.function.arguments),
                    )
                )

        return ChatResponse(
            content=choice.message.content or "",
            model=response.model,
            provider=self.provider_type,
            usage={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
            finish_reason=choice.finish_reason,
            tool_calls=tool_calls,
            metadata={
                "openrouter_model": response.model,
                "provider": getattr(response, "provider", None),
            },
        )

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream chat completion via OpenRouter."""
        if not self._client:
            await self.initialize()

        config = config or GenerationConfig()
        openrouter_messages = self._convert_messages(messages)
        openrouter_tools = self._convert_tools(tools)

        kwargs = {
            "model": self.config.default_model,
            "messages": openrouter_messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "stop": config.stop_sequences or None,
            "presence_penalty": config.presence_penalty,
            "frequency_penalty": config.frequency_penalty,
            "response_format": config.response_format,
            "seed": config.seed,
            "stream": True,
        }
        if openrouter_tools:
            kwargs["tools"] = openrouter_tools
            kwargs["tool_choice"] = "auto"

        stream = await self._client.chat.completions.create(**kwargs)

        tool_calls_buffer: dict[int, dict] = {}

        async for chunk in stream:
            if not chunk.choices:
                continue

            choice = chunk.choices[0]
            delta = choice.delta

            if delta.content:
                yield StreamChunk(
                    content=delta.content,
                    model=chunk.model,
                    provider=self.provider_type,
                    is_final=False,
                )

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    index = tc.index
                    if index not in tool_calls_buffer:
                        tool_calls_buffer[index] = {
                            "id": tc.id,
                            "name": tc.function.name,
                            "arguments": tc.function.arguments or "",
                        }
                    else:
                        if tc.function.arguments:
                            tool_calls_buffer[index]["arguments"] += tc.function.arguments

            if choice.finish_reason:
                tool_calls = []
                for tc_data in tool_calls_buffer.values():
                    try:
                        args = json.loads(tc_data["arguments"])
                    except json.JSONDecodeError:
                        args = {}
                    tool_calls.append(ToolCall(id=tc_data["id"], name=tc_data["name"], arguments=args))

                yield StreamChunk(
                    content="",
                    model=chunk.model,
                    provider=self.provider_type,
                    is_final=True,
                    finish_reason=choice.finish_reason,
                    tool_calls=tool_calls,
                    usage=(
                        {
                            "prompt_tokens": chunk.usage.prompt_tokens if chunk.usage else 0,
                            "completion_tokens": chunk.usage.completion_tokens if chunk.usage else 0,
                            "total_tokens": chunk.usage.total_tokens if chunk.usage else 0,
                        }
                        if chunk.usage
                        else None
                    ),
                )

    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
    ) -> ChatResponse:
        """Generate text completion."""
        return await self.chat(
            messages=[ChatMessage(role=MessageRole.USER, content=prompt)],
            config=config,
        )

    async def embeddings(
        self,
        texts: list[str],
        model: Optional[str] = None,
    ) -> EmbeddingResponse:
        """Generate embeddings via OpenRouter (if supported by selected model)."""
        if not self._client:
            await self.initialize()

        embedding_model = model or "openai/text-embedding-3-small"
        response = await self._client.embeddings.create(
            model=embedding_model,
            input=texts,
        )

        return EmbeddingResponse(
            embeddings=[data.embedding for data in response.data],
            model=embedding_model,
            provider=self.provider_type,
            usage={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
        )

    async def vision(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
        config: Optional[GenerationConfig] = None,
    ) -> ChatResponse:
        """Generate response with vision input via OpenRouter."""
        if not self._client:
            await self.initialize()

        config = config or GenerationConfig()
        vision_messages = self._convert_vision_messages(messages, images)

        response = await self._client.chat.completions.create(
            model=self.config.default_model,
            messages=vision_messages,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            top_p=config.top_p,
        )

        choice = response.choices[0]
        return ChatResponse(
            content=choice.message.content or "",
            model=response.model,
            provider=self.provider_type,
            usage={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
            finish_reason=choice.finish_reason,
        )