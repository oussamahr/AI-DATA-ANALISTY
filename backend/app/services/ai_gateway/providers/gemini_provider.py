"""
Google Gemini provider implementation.

Supports Gemini 1.5 Pro, Gemini 1.5 Flash, and future versions.
"""

import json
from typing import Any, AsyncGenerator, Optional

import google.generativeai as genai
from google.generativeai.types import GenerationConfig as GeminiGenerationConfig

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
        self._model: Any = None
        self._embedding_model: Any = None

    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.GEMINI

    @property
    def default_model(self) -> str:
        return self.config.default_model or "gemini-1.5-flash"

    async def initialize(self) -> None:
        """Initialize Gemini client."""
        genai.configure(api_key=self.config.api_key)
        self._model = genai.GenerativeModel(self.config.default_model)
        self._embedding_model = genai.GenerativeModel("embedding-001")

    async def close(self) -> None:
        """Close Gemini client (no explicit close needed)."""
        self._model = None
        self._embedding_model = None

    def _convert_messages(self, messages: list[ChatMessage]) -> list[dict[str, Any]]:
        """Convert internal messages to Gemini format."""
        result = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                # Gemini uses system_instruction parameter, not messages
                continue
            elif msg.role == MessageRole.USER:
                result.append({"role": "user", "parts": [msg.content]})
            elif msg.role == MessageRole.ASSISTANT:
                if msg.tool_calls:
                    # Handle tool calls
                    parts = []
                    if msg.content:
                        parts.append(msg.content)
                    for tc in msg.tool_calls:
                        parts.append(
                            {
                                "function_call": {
                                    "name": tc.name,
                                    "args": tc.arguments,
                                }
                            }
                        )
                    result.append({"role": "model", "parts": parts})
                else:
                    result.append({"role": "model", "parts": [msg.content]})
            elif msg.role == MessageRole.TOOL:
                result.append(
                    {
                        "role": "user",
                        "parts": [
                            {
                                "function_response": {
                                    "name": msg.name or "unknown",
                                    "response": {"content": msg.content},
                                }
                            }
                        ],
                    }
                )
        return result

    def _extract_system_instruction(self, messages: list[ChatMessage]) -> Optional[str]:
        """Extract system instruction from messages."""
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                return msg.content
        return None

    def _convert_tools(self, tools: Optional[list[dict[str, Any]]]) -> Optional[list[dict[str, Any]]]:
        """Convert tools to Gemini format."""
        if not tools:
            return None
        # Convert OpenAI-style tools to Gemini function declarations
        function_declarations = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool.get("function", {})
                function_declarations.append(
                    {
                        "name": func.get("name"),
                        "description": func.get("description", ""),
                        "parameters": func.get("parameters", {}),
                    }
                )
        return [{"function_declarations": function_declarations}] if function_declarations else None

    def _convert_vision_messages(
        self,
        messages: list[ChatMessage],
        images: list[VisionInput],
    ) -> list[dict[str, Any]]:
        """Convert messages with images to Gemini format."""
        result = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                continue
            elif msg.role == MessageRole.USER:
                parts = []
                if msg.content:
                    parts.append(msg.content)
                for img in images:
                    if img.image_base64:
                        parts.append(
                            {
                                "mime_type": "image/jpeg",
                                "data": img.image_base64,
                            }
                        )
                    elif img.image_url:
                        # For URL images, we'd need to fetch them first
                        # For now, just add as text reference
                        parts.append(f"[Image: {img.image_url}]")
                result.append({"role": "user", "parts": parts})
            elif msg.role == MessageRole.ASSISTANT:
                result.append({"role": "model", "parts": [msg.content] if msg.content else []})
        return result

    def _build_generation_config(self, config: GenerationConfig) -> GeminiGenerationConfig:
        """Build Gemini generation config."""
        return GeminiGenerationConfig(
            temperature=config.temperature,
            max_output_tokens=config.max_tokens,
            top_p=config.top_p,
            top_k=config.top_k if config.top_k > 0 else None,
            stop_sequences=config.stop_sequences or None,
            response_mime_type="application/json" if config.response_format else None,
        )

    async def chat(
        self,
        messages: list[ChatMessage],
        config: Optional[GenerationConfig] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> ChatResponse:
        """Generate chat completion."""
        if not self._model:
            await self.initialize()

        config = config or GenerationConfig()
        system_instruction = self._extract_system_instruction(messages)
        gemini_messages = self._convert_messages(messages)
        gemini_tools = self._convert_tools(tools)
        generation_config = self._build_generation_config(config)

        # Create model with system instruction if present
        if system_instruction:
            model = genai.GenerativeModel(
                self.config.default_model,
                system_instruction=system_instruction,
                tools=gemini_tools,
            )
        else:
            model = self._model

        response = await model.generate_content_async(
            gemini_messages,
            generation_config=generation_config,
            tools=gemini_tools,
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

        return ChatResponse(
            content=content,
            model=self.config.default_model,
            provider=self.provider_type,
            usage={
                "prompt_tokens": response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
                "completion_tokens": response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
                "total_tokens": response.usage_metadata.total_token_count if response.usage_metadata else 0,
            },
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
        if not self._model:
            await self.initialize()

        config = config or GenerationConfig()
        system_instruction = self._extract_system_instruction(messages)
        gemini_messages = self._convert_messages(messages)
        gemini_tools = self._convert_tools(tools)
        generation_config = self._build_generation_config(config)

        if system_instruction:
            model = genai.GenerativeModel(
                self.config.default_model,
                system_instruction=system_instruction,
                tools=gemini_tools,
            )
        else:
            model = self._model

        stream = await model.generate_content_async(
            gemini_messages,
            generation_config=generation_config,
            tools=gemini_tools,
            stream=True,
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
        if not self._embedding_model:
            await self.initialize()

        embedding_model_name = model or "embedding-001"
        embeddings = []

        # Process in batches for efficiency
        for text in texts:
            result = await genai.embed_content_async(
                model=embedding_model_name,
                content=text,
                task_type="retrieval_document",
            )
            embeddings.append(result["embedding"])

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
        if not self._model:
            await self.initialize()

        config = config or GenerationConfig()
        system_instruction = self._extract_system_instruction(messages)
        vision_messages = self._convert_vision_messages(messages, images)
        generation_config = self._build_generation_config(config)

        if system_instruction:
            model = genai.GenerativeModel(
                self.config.default_model,
                system_instruction=system_instruction,
            )
        else:
            model = self._model

        response = await model.generate_content_async(
            vision_messages,
            generation_config=generation_config,
        )

        content = ""
        if response.candidates:
            candidate = response.candidates[0]
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if hasattr(part, "text") and part.text:
                        content += part.text

        return ChatResponse(
            content=content,
            model=self.config.default_model,
            provider=self.provider_type,
            usage={
                "prompt_tokens": response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
                "completion_tokens": response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
                "total_tokens": response.usage_metadata.total_token_count if response.usage_metadata else 0,
            },
            finish_reason=response.candidates[0].finish_reason.name if response.candidates else None,
        )