"""
Anthropic Claude provider implementation.

Supports Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, and future versions.
"""

import json
from typing import Any, AsyncGenerator, Optional

from anthropic import AsyncAnthropic

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
    VisionInput,
)


class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider."""

    def __init__(self, config: AIProviderConfig):
        super().__init__(config)
        self._client: Optional[AsyncAnthropic] = None

    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.ANTHROPIC

    @property
    def default_model(self) -> str:
        return self.config.default_model or "claude-3-5-sonnet-20241022"

    async def initialize(self) -> None:
        """Initialize Anthropic client."""
        self._client = AsyncAnthropic(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
            default_headers=self.config.extra_headers,
        )

    async def close(self) -> None:
        """Close Anthropic client."""
        if self._client:
            await self._client.close()
            self._client = None

    def _convert_messages(self, messages: list[ChatMessage]) -> tuple[Optional[str], list[dict[str, Any]]]:
        """Convert internal messages to Anthropic format. Returns (system_prompt, messages)."""
        system_prompt = None
        anthropic_messages = []

        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content
            elif msg.role == MessageRole.USER:
                if msg.tool_calls:
                    # User message with tool calls (unusual but possible)
                    content = []
                    if msg.content:
                        content.append({"type": "text", "text": msg.content})
                    for tc in msg.tool_calls:
                        content.append(
                            {
                                "type": "tool_use",
                                "id": tc.id,
                                "name": tc.name,
                                "input": tc.arguments,
                            }
                        )
                    anthropic_messages.append({"role": "user", "content": content})
                else:
                    anthropic_messages.append({"role": "user", "content": msg.content})
            elif msg.role == MessageRole.ASSISTANT:
                if msg.tool_calls:
                    content = []
                    if msg.content:
                        content.append({"type": "text", "text": msg.content})
                    for tc in msg.tool_calls:
                        content.append(
                            {
                                "type": "tool_use",
                                "id": tc.id,
                                "name": tc.name,
                                "input": tc.arguments,
                            }
                        )
                    anthropic_messages.append({"role": "assistant", "content": content})
                else:
                    anthropic_messages.append({"role": "assistant", "content": msg.content})
            elif msg.role == MessageRole.TOOL:
                anthropic_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": msg.tool_call_id,
                                "content": msg.content,
                            }
                        ],
                    }
                )

        return system_prompt, anthropic_messages

    def _convert_tools(self, tools: Optional[list[dict[str, Any]]]) -> Optional[list[dict[str, Any]]]:
        """Convert tools to Anthropic format."""
        if not tools:
            return None
        anthropic_tools = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool.get("function", {})
                anthropic_tools.append(
                    {
                        "name": func.get("name"),
                        "description": func.get("description", ""),
                        "input_schema": func.get("parameters", {}),
                    }
                )
        return anthropic_tools if anthropic_tools else None

    def _convert_vision_messages(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
    ) -> tuple[Optional[str], list[dict[str, Any]]]:
        """Convert messages with images to Anthropic format."""
        system_prompt = None
        anthropic_messages = []

        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content
            elif msg.role == MessageRole.USER:
                content = []
                if msg.content:
                    content.append({"type": "text", "text": msg.content})
                for img in images:
                    if img.image_base64:
                        content.append(
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": img.image_base64,
                                },
                            }
                        )
                    elif img.image_url:
                        content.append(
                            {
                                "type": "image",
                                "source": {
                                    "type": "url",
                                    "url": img.image_url,
                                },
                            }
                        )
                anthropic_messages.append({"role": "user", "content": content})
            elif msg.role == MessageRole.ASSISTANT:
                anthropic_messages.append({"role": "assistant", "content": msg.content})

        return system_prompt, anthropic_messages

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
        system_prompt, anthropic_messages = self._convert_messages(messages)
        anthropic_tools = self._convert_tools(tools)

        response = await self._client.messages.create(
            model=self.config.default_model,
            system=system_prompt,
            messages=anthropic_messages,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            top_p=config.top_p,
            stop_sequences=config.stop_sequences or None,
            tools=anthropic_tools,
        )

        content = ""
        tool_calls = []

        for block in response.content:
            if block.type == "text":
                content += block.text
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input,
                    )
                )

        return ChatResponse(
            content=content,
            model=response.model,
            provider=self.provider_type,
            usage={
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            },
            finish_reason=response.stop_reason,
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
        system_prompt, anthropic_messages = self._convert_messages(messages)
        anthropic_tools = self._convert_tools(tools)

        stream = await self._client.messages.stream(
            model=self.config.default_model,
            system=system_prompt,
            messages=anthropic_messages,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            top_p=config.top_p,
            stop_sequences=config.stop_sequences or None,
            tools=anthropic_tools,
        )

        tool_calls_buffer: dict[str, dict] = {}
        current_text = ""

        async with stream as s:
            async for event in s:
                if event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        tool_calls_buffer[event.content_block.id] = {
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "arguments": {},
                        }
                elif event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        current_text += event.delta.text
                        yield StreamChunk(
                            content=event.delta.text,
                            model=self.config.default_model,
                            provider=self.provider_type,
                            is_final=False,
                        )
                    elif event.delta.type == "input_json_delta":
                        tc_id = event.content_block.id if hasattr(event, "content_block") else list(tool_calls_buffer.keys())[0]
                        if tc_id in tool_calls_buffer:
                            tool_calls_buffer[tc_id]["arguments"] = event.delta.partial_json
                elif event.type == "message_stop":
                    tool_calls = []
                    for tc_data in tool_calls_buffer.values():
                        try:
                            args = json.loads(tc_data["arguments"]) if isinstance(tc_data["arguments"], str) else tc_data["arguments"]
                        except json.JSONDecodeError:
                            args = {}
                        tool_calls.append(ToolCall(id=tc_data["id"], name=tc_data["name"], arguments=args))

                    yield StreamChunk(
                        content="",
                        model=self.config.default_model,
                        provider=self.provider_type,
                        is_final=True,
                        finish_reason="end_turn",
                        tool_calls=tool_calls,
                        usage={
                            "prompt_tokens": event.message.usage.input_tokens if hasattr(event, "message") and event.message else 0,
                            "completion_tokens": event.message.usage.output_tokens if hasattr(event, "message") and event.message else 0,
                            "total_tokens": (event.message.usage.input_tokens + event.message.usage.output_tokens)
                            if hasattr(event, "message") and event.message
                            else 0,
                        },
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
        """Anthropic doesn't support embeddings directly."""
        raise NotImplementedError("Embeddings not supported by Anthropic")

    async def vision(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
        config: Optional[GenerationConfig] = None,
    ) -> ChatResponse:
        """Generate response with vision input."""
        if not self._client:
            await self.initialize()

        config = config or GenerationConfig()
        system_prompt, anthropic_messages = self._convert_vision_messages(messages, images)

        response = await self._client.messages.create(
            model=self.config.default_model,
            system=system_prompt,
            messages=anthropic_messages,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            top_p=config.top_p,
        )

        content = ""
        for block in response.content:
            if block.type == "text":
                content += block.text

        return ChatResponse(
            content=content,
            model=response.model,
            provider=self.provider_type,
            usage={
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            },
            finish_reason=response.stop_reason,
        )