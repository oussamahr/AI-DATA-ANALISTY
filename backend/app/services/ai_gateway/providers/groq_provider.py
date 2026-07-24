"""
Groq provider implementation.

Supports Llama 3, Llama 3.1, Qwen, DeepSeek, Gemma, and other models on Groq.
"""

import json
from typing import Any, AsyncGenerator, Optional

from groq import AsyncGroq

from app.services.ai_gateway.providers.base import (
    AIProvider,
    AIProviderConfig,
    ChatMessage,
    ChatResponse,
    GenerationConfig,
    MessageRole,
    ProviderType,
    StreamChunk,
    ToolCall,
)


class GroqProvider(AIProvider):
    """Groq API provider for fast inference."""

    def __init__(self, config: AIProviderConfig):
        super().__init__(config)
        self._client: Optional[AsyncGroq] = None

    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.GROQ

    @property
    def default_model(self) -> str:
        return self.config.default_model or "llama-3.3-70b-versatile"

    async def initialize(self) -> None:
        """Initialize Groq client."""
        self._client = AsyncGroq(
            api_key=self.config.api_key,
            timeout=self.config.timeout,
        )

    async def close(self) -> None:
        """Close Groq client."""
        if self._client:
            await self._client.close()
            self._client = None

    def _convert_messages(self, messages: list[ChatMessage]) -> list[dict[str, Any]]:
        """Convert internal messages to Groq/OpenAI format."""
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
        """Convert tools to Groq format."""
        return tools

    async def chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> ChatResponse:
        """Generate chat completion."""
        if not self._client:
            await self.initialize()

        config = config or GenerationConfig()
        groq_messages = self._convert_messages(messages)
        groq_tools = self._convert_tools(tools)

        kwargs = {
            "model": self.config.default_model,
            "messages": groq_messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "stop": config.stop_sequences or None,
        }
        if groq_tools:
            kwargs["tools"] = groq_tools
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
        )

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream chat completion."""
        if not self._client:
            await self.initialize()

        config = config or GenerationConfig()
        groq_messages = self._convert_messages(messages)
        groq_tools = self._convert_tools(tools)

        kwargs = {
            "model": self.config.default_model,
            "messages": groq_messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "stop": config.stop_sequences or None,
            "stream": True,
        }
        if groq_tools:
            kwargs["tools"] = groq_tools
            kwargs["tool_choice"] = "auto"

        stream = await self._client.chat.completions.create(**kwargs)

        accumulated_content = ""
        tool_calls_buffer: dict[int, dict] = {}

        async for chunk in stream:
            if not chunk.choices:
                continue

            choice = chunk.choices[0]
            delta = choice.delta

            if delta.content:
                accumulated_content += delta.content
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
    ):
        """Groq doesn't support embeddings."""
        raise NotImplementedError("Embeddings not supported by Groq")

    async def vision(
        self,
        messages: list[ChatMessage],
        images: list,
        config: Optional[GenerationConfig] = None,
    ):
        """Groq doesn't support vision (yet)."""
        raise NotImplementedError("Vision not supported by Groq")