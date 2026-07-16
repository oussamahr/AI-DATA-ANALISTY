from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class LLMQueryRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=32000)
    dataset_id: UUID | None = None


class LLMQueryResponse(BaseModel):
    id: UUID
    response: str
    model: str
    tokens_prompt: int
    tokens_completion: int
    duration_ms: int | None
    created_at: datetime


class LLMQueryHistoryItem(BaseModel):
    id: UUID
    prompt: str
    response: str | None = None
    model: str
    success: bool
    created_at: datetime
