from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ImputeConfig(BaseModel):
    column: str
    strategy: str = Field(..., pattern="^(mean|median|mode|constant|drop)$")
    fill_value: str | None = None


class OutlierConfig(BaseModel):
    column: str
    method: str = Field("iqr", pattern="^(iqr|zscore)$")
    threshold: float = 1.5


class CastConfig(BaseModel):
    column: str
    target_type: str = Field(..., pattern="^(numeric|int|float|string|datetime|category)$")


class FilterCondition(BaseModel):
    column: str
    operator: str = Field(
        ..., pattern="^(eq|neq|gt|gte|lt|lte|in|not_in|contains|is_null|not_null)$"
    )
    value: str | None = None
    values: list[str] | None = None


class FilterConfig(BaseModel):
    conditions: list[FilterCondition]
    logic: str = Field("and", pattern="^(and|or)$")


class RenameConfig(BaseModel):
    column: str
    new_name: str


class DropConfig(BaseModel):
    columns: list[str] = Field(..., min_length=1)


class NormalizeConfig(BaseModel):
    column: str
    method: str = Field("minmax", pattern="^(minmax|zscore)$")


class EncodeConfig(BaseModel):
    column: str
    drop_first: bool = False


class TransformRequest(BaseModel):
    dataset_id: UUID
    transform_type: str
    config: dict
    name: str = ""


class TransformResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    transform_type: str
    name: str
    config: dict
    applied_order: int
    created_at: datetime


class ApplyTransformsRequest(BaseModel):
    dataset_id: UUID
    output_name: str = ""


class TransformHistory(BaseModel):
    model_config = {"from_attributes": True}

    dataset_id: UUID
    transforms: list[TransformResponse]
