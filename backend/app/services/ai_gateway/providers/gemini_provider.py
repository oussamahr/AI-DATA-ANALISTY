"""
Google Gemini provider implementation.

Supports Gemini 1.5 Pro, Gemini 1.5 Flash, and future versions.
Uses the new google-genai package (replacing deprecated google-generativeai).
"""

import json
from typing import Any, AsyncGenerator, Optional

from google import genai
from google.genai import types as gemini_types

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


class GeminiProvider(AIProvider):
    """Google Gemini API provider."""

    def __init__(self, config: AIProviderConfig):
        super().__init__(config)
        self._client: Any = None
        self._embedding_model: Any = None

    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.GEMINI

    @property
    def default_model(self) -> str:
        return self.config.default_model or "gemini-2.0-flash"

    async def initialize(self) -> None:
        """Initialize Gemini client."""
        self._client = genai.Client(api_key=self.config.api_key)

    async def close(self) -> None:
        """Close Gemini client (no explicit close needed)."""
        self._client = None

    def _convert_messages(self, messages: list[ChatMessage]) -> list[gemini_types.Content]:
        """Convert internal messages to Gemini Content format."""
        result = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                # Gemini uses system_instruction parameter, not messages
                continue
            elif msg.role == MessageRole.USER:
                result.append(
                    gemini_types.Content(
                        role="user",
                        parts=[gemini_types.Part(text=msg.content)],
                    )
                )
            elif msg.role == MessageRole.ASSISTANT:
                if msg.tool_calls:
                    # Handle tool calls
                    parts = []
                    if msg.content:
                        parts.append(gemini_types.Part(text=msg.content))
                    for tc in msg.tool_calls:
                        parts.append(
                            gemini_types.Part(
                                function_call=gemini_types.FunctionCall(
                                    name=tc.name,
                                    args=tc.arguments,
                                )
                            )
                        )
                    result.append(
                        gemini_types.Content(role="model", parts=parts)
                    )
                else:
                    result.append(
                        gemini_types.Content(
                            role="model",
                            parts=[gemini_types.Part(text=msg.content)] if msg.content else [],
                        )
                    )
            elif msg.role == MessageRole.TOOL:
                result.append(
                    gemini_types.Content(
                        role="user",
                        parts=[
                            gemini_types.Part(
                                function_response=gemini_types.FunctionResponse(
                                    name=msg.name or "unknown",
                                    response={"content": msg.content},
                                )
                            )
                        ],
                    )
                )
        return result

    def _extract_system_instruction(self, messages: list[ChatMessage]) -> Optional[str]:
        """Extract system instruction from messages."""
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                return msg.content
        return None

    def _convert_tools(self, tools: Optional[list[dict[str, Any]]]) -> Optional[list[gemini_types.Tool]]:
        """Convert tools to Gemini format."""
        if not tools:
            return None
        # Convert OpenAI-style tools to Gemini function declarations
        function_declarations = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool.get("function", {})
                function_declarations.append(
                    gemini_types.FunctionDeclaration(
                        name=func.get("name"),
                        description=func.get("description", ""),
                        parameters=func.get("parameters", {}),
                    )
                )
        return [gemini_types.Tool(function_declarations=function_declarations)] if function_declarations else None

    def _convert_vision_messages(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
    ) -> list[gemini_types.Content]:
        """Convert messages with images to Gemini format."""
        result = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                continue
            elif msg.role == MessageRole.USER:
                parts = []
                if msg.content:
                    parts.append(gemini_types.Part(text=msg.content))
                for img in images:
                    if img.image_base64:
                        parts.append(
                            gemini_types.Part(
                                inline_data=gemini_types.Blob(
                                    mimeType="image/jpeg",
                                    data=img.image_base64,
                                )
                            )
                        )
                    elif img.image_url:
                        # For URL images, we'd need to fetch them first
                        # For now, just add as text reference
                        parts.append(gemini_types.Part(text=f"[Image: {img.image_url}]"))
                result.append(
                    gemini_types.Content(role="user", parts=parts)
                )
            elif msg.role == MessageRole.ASSISTANT:
                result.append(
                    gemini_types.Content(
                        role="model",
                        parts=[gemini_types.Part(text=msg.content)] if msg.content else [],
                    )
                )
        return result

    def _build_generate_content_config(self, config: GenerationConfig) -> gemini_types.GenerateContentConfig:
        """Build Gemini generation config."""
        gc = gemini_types.GenerateContentConfig(
            temperature=config.temperature,
            maxOutputTokens=config.max_tokens,
            topP=config.top_p,
        )
        if config.stop_sequences:
            gc.stopSequences = config.stop_sequences
        if config.top_k > 0:
            gc.topK = config.top_k
        if config.response_format:
            gc.responseMimeType = "application/json"
        return gc

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
        system_instruction = self._extract_system_instruction(messages)
        gemini_messages = self._convert_messages(messages)
        gemini_tools = self._convert_tools(tools)
        generation_config = self._build_generate_content_config(config)

        # Add system instruction to config if present
        if system_instruction:
            generation_config.system_instruction = system_instruction

        response = await self._client.aio.models.generate_content(
            model=self.config.default_model,
            contents=gemini_messages,
            config=generation_config,
        )

        # Extract content and tool calls
        content = ""
        tool_calls = []

        if response.candidates:
            candidate = response.candidates[0]
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if hasattr(part, "text") and part.text:
                        content += part.text
                    elif hasattr(part, "function_call"):
                        fc = part.function_call
                        tool_calls.append(
                            ToolCall(
                                id=f"call_{fc.name}",
                                name=fc.name,
                                arguments=dict(fc.args) if fc.args else {},
                            )
                        )

        usage = {}
        if response.usage_metadata:
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count,
            }

        return ChatResponse(
            content=content,
            model=self.config.default_model,
            provider=self.provider_type,
            usage=usage,
            finish_reason=response.candidates[0].finish_reason.name if response.candidates else None,
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
        system_instruction = self._extract_system_instruction(messages)
        gemini_messages = self._convert_messages(messages)
        gemini_tools = self._convert_tools(tools)
        generation_config = self._build_generate_content_config(config)

        if system_instruction:
            generation_config.system_instruction = system_instruction

        stream = await self._client.aio.models.generate_content_stream(
            model=self.config.default_model,
            contents=gemini_messages,
            config=generation_config,
        )

        tool_calls_buffer: list[ToolCall] = []

        async for chunk in stream:
            content = ""
            if chunk.candidates:
                candidate = chunk.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, "text") and part.text:
                            content += part.text
                        elif hasattr(part, "function_call"):
                            fc = part.function_call
                            tool_calls_buffer.append(
                                ToolCall(
                                    id=f"call_{fc.name}",
                                    name=fc.name,
                                    arguments=dict(fc.args) if fc.args else {},
                                )
                            )

            is_final = bool(chunk.candidates and chunk.candidates[0].finish_reason)
            finish_reason = chunk.candidates[0].finish_reason.name if chunk.candidates else None

            yield StreamChunk(
                content=content,
                model=self.config.default_model,
                provider=self.provider_type,
                is_final=is_final,
                finish_reason=finish_reason,
                tool_calls=tool_calls_buffer if is_final else [],
            )
            if is_final:
                tool_calls_buffer = []

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
        """Generate embeddings using Gemini embedding model."""
        if not self._client:
            await self.initialize()

        embedding_model_name = model or "text-embedding-004"
        embeddings = []

        # Process in batches for efficiency
        for text in texts:
            result = await self._client.aio.models.embed_content(
                model=embedding_model_name,
                contents=text,
                config=gemini_types.EmbedContentConfig(
                    taskType="RETRIEVAL_DOCUMENT",
                ),
            )
            embeddings.append(result.embeddings[0].values)

        return EmbeddingResponse(
            embeddings=embeddings,
            model=embedding_model_name,
            provider=self.provider_type,
            usage={"total_tokens": sum(len(t.split()) for t in texts)},
        )

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
        system_instruction = self._extract_system_instruction(messages)
        vision_messages = self._convert_vision_messages(messages, images)
        generation_config = self._build_generate_content_config(config)

        if system_instruction:
            generation_config.system_instruction = system_instruction

        response = await self._client.aio.models.generate_content(
            model=self.config.default_model,
            contents=vision_messages,
            config=generation_config,
        )

        content = ""
        if response.candidates:
            candidate = response.candidates[0]
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if hasattr(part, "text") and part.text:
                        content += part.text

        usage = {}
        if response.usage_metadata:
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count,
            }

        return ChatResponse(
            content=content,
            model=self.config.default_model,
            provider=self.provider_type,
            usage=usage,
            finish_reason=response.candidates[0].finish_reason.name if response.candidates else None,
        )
