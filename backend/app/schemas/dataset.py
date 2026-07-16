from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    file_size_bytes: int
    mime_type: str
    row_count: int | None
    contains_pii: bool
    owner_id: UUID
    tenant_id: UUID
    parent_id: UUID | None
    created_at: datetime
    updated_at: datetime


class DatasetListResponse(BaseModel):
    items: list[DatasetResponse]
    total: int
    page: int
    page_size: int
