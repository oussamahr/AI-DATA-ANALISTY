from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ColumnProfile(BaseModel):
    column_name: str
    dtype: str
    semantic_type: str | None = None
    null_count: int
    total_count: int
    null_percent: float
    unique_count: int
    unique_percent: float
    min_val: str | None = None
    max_val: str | None = None
    mean: float | None = None
    median: float | None = None
    std: float | None = None
    top_values: list[dict] = []
    histogram: list[dict] = []


class DatasetProfileResponse(BaseModel):
    dataset_id: UUID
    dataset_name: str
    row_count: int
    column_count: int
    columns: list[ColumnProfile]
    generated_at: datetime


class CorrelationResult(BaseModel):
    column_1: str
    column_2: str
    correlation: float


class CorrelationResponse(BaseModel):
    dataset_id: UUID
    numeric_columns: list[str]
    correlations: list[CorrelationResult]
    matrix: list[list[float]]


class DistributionEntry(BaseModel):
    column_name: str
    dtype: str
    histogram: list[dict] = []
    top_values: list[dict] = []


class DistributionResponse(BaseModel):
    dataset_id: UUID
    distributions: list[DistributionEntry]


class AnalysisConfig(BaseModel):
    include_correlations: bool = True
    include_distributions: bool = True
    include_ai_insights: bool = False
    max_categories: int = 20


class AnalysisRunRequest(BaseModel):
    dataset_id: UUID
    analysis_type: str = "comprehensive"
    config: AnalysisConfig = AnalysisConfig()


class AnalysisRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    dataset_id: UUID
    analysis_type: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    error_message: str | None = None


class TaskResponse(BaseModel):
    run_id: UUID
    status: str
    message: str = "Task queued"


class InsightItem(BaseModel):
    type: str
    severity: str
    title: str
    description: str
    details: dict = {}
    recommendation: str | None = None


class AIInsightResponse(BaseModel):
    dataset_id: UUID
    dataset_name: str
    summary: str
    insights: list[InsightItem]
    generated_at: datetime


class ReportSection(BaseModel):
    title: str
    content: str | dict | list
    type: str = "text"


class AnalysisReport(BaseModel):
    dataset_id: UUID
    dataset_name: str
    row_count: int
    column_count: int
    generated_at: datetime
    profile: list[ColumnProfile]
    correlations: list[CorrelationResult] | None = None
    distributions: list[DistributionEntry] | None = None
    ai_insights: list[InsightItem] | None = None
    sections: list[ReportSection] = []
