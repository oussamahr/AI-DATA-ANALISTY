"""
AI Analytics API Routes.

Provides endpoints for all advanced AI-powered analytics features.
"""

import logging
import re
import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.core.security.audit import audit_logger
from app.core.security.exceptions import AppException
from app.core.security.rate_limit import rate_limit_dependency
from app.models.dataset import Dataset
from app.models.user import User
from app.services.ai_gateway import (
    AIGateway,
    ChatMessage,
    GenerationConfig,
    MessageRole,
    ProviderType,
    get_ai_gateway,
)
from app.services.ai_gateway.analytics import AIAnalyticsEngine, get_ai_analytics_engine
from app.services.ai_gateway.context_builder import get_context_builder
from app.services.ai_gateway.memory import ConversationMemory, get_conversation_memory
from app.services.ai_gateway.prompts import PromptLibrary, get_prompt_library
from app.services.data_loader import load_dataframe as _load_dataframe

logger = logging.getLogger(__name__)

# Prompt injection detection patterns (same as in llm_service.py)
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?prior", re.IGNORECASE),
    re.compile(r"override\s+(your|all)\s+(rules|instructions|guidelines)", re.IGNORECASE),
    re.compile(r"act\s+as\s+(a|an)\s+unrestricted", re.IGNORECASE),
    re.compile(r"\bDAN\b.*jailbreak", re.IGNORECASE),
    re.compile(r"reveal\s+(your|the)\s+(system|original)\s+prompt", re.IGNORECASE),
    re.compile(r"output\s+(your|the)\s+(system|initial)\s+message", re.IGNORECASE),
]


def detect_prompt_injection(text: str) -> Optional[str]:
    """Detect potential prompt injection in user input."""
    for pattern in INJECTION_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group()
    return None


def sanitize_for_prompt(text: str) -> str:
    """Basic sanitization for prompt inclusion."""
    import xml.sax.saxutils as saxutils
    return saxutils.escape(text, {'"': "&quot;", "'": "&apos;"})

router = APIRouter()


# ==================== Request/Response Models ====================

class ProfileDatasetRequest(BaseModel):
    force: bool = False


class ProfileDatasetResponse(BaseModel):
    dataset_id: UUID
    dataset_name: str
    row_count: int
    column_count: int
    quality_score: float
    completeness: float
    consistency: float
    accuracy: float
    business_summary: str
    suggested_charts: list[dict]
    suggested_kpis: list[dict]
    suggested_dashboards: list[dict]
    generated_at: str


class DataQualityResponse(BaseModel):
    dataset_id: UUID
    overall_score: float
    completeness: float
    consistency: float
    accuracy: float
    validity: float
    uniqueness: float
    issues: list[dict]
    suggestions: list[dict]
    column_scores: dict[str, float]


class InsightResponse(BaseModel):
    type: str
    severity: str
    title: str
    description: str
    details: dict = {}
    recommendation: Optional[str] = None
    confidence: float = 1.0


class InsightsResponse(BaseModel):
    dataset_id: UUID
    insights: list[InsightResponse]
    summary: str
    generated_at: str


class CleaningStepRequest(BaseModel):
    operation: str
    column: str
    parameters: dict = {}
    description: str
    reversible: bool = True
    estimated_rows_affected: int = 0


class CleaningPlanRequest(BaseModel):
    steps: list[CleaningStepRequest]
    execution_order: list[int]
    rollback_plan: str
    validation_queries: list[str]


class CleaningExecuteResponse(BaseModel):
    steps_executed: list[str]
    rows_affected: int
    errors: list[str]
    original_shape: list[int]
    final_shape: list[int]


class ForecastRequest(BaseModel):
    date_column: str
    value_column: str
    periods: int = 12
    confidence: float = 0.95


class ForecastResponse(BaseModel):
    model: str
    forecast: list[dict]
    accuracy_metrics: dict
    trend: str
    seasonality_detected: bool
    assumptions: list[str]
    risks: list[str]


class AnomalyResponse(BaseModel):
    point_anomalies: list[dict]
    contextual_anomalies: list[dict]
    collective_anomalies: list[dict]
    fraud_indicators: list[dict]
    summary: dict


class ChartRecommendationResponse(BaseModel):
    chart_type: str
    title: str
    description: str
    x_column: Optional[str] = None
    y_columns: list[str] = []
    color_column: Optional[str] = None
    facet_column: Optional[str] = None
    reason: str
    priority: int
    config: dict = {}


class ChartRecommendationsResponse(BaseModel):
    recommendations: list[ChartRecommendationResponse]
    dashboard_layout: list[dict]
    color_scheme: str
    accessibility_notes: list[str]


class NLQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class NLQueryResponse(BaseModel):
    sql: str
    explanation: str
    is_safe: bool
    estimated_rows: int
    columns: list[str]


class SQLExplainRequest(BaseModel):
    sql: str = Field(..., min_length=1, max_length=5000)


class SQLExplainResponse(BaseModel):
    explanation: str


class ReportRequest(BaseModel):
    time_period: str = "Last 30 days"
    report_type: str = "executive"  # executive, technical, business


class ReportResponse(BaseModel):
    title: str
    content: str
    format: str
    generated_at: str


class DashboardRequest(BaseModel):
    business_context: str = ""
    user_roles: list[str] = ["analyst", "manager"]
    key_questions: list[str] = []


class DashboardResponse(BaseModel):
    dashboard: dict
    kpis: list[dict]
    charts: list[dict]
    filters: list[dict]
    tabs: list[dict]
    insights_panel: bool
    export_enabled: bool


# ==================== Python Code Generation ====================

class PythonCodeRequest(BaseModel):
    task_description: str = Field(..., min_length=1, max_length=2000)
    libraries: list[str] = ["pandas", "numpy", "matplotlib", "seaborn", "plotly", "scikit-learn"]


class PythonCodeResponse(BaseModel):
    code: str
    description: str
    dependencies: list[str]
    expected_outputs: list[str]


class AnalysisPipelineRequest(BaseModel):
    analysis_goals: str = Field(..., min_length=1, max_length=2000)
    target_column: Optional[str] = None


class VisualizationCodeRequest(BaseModel):
    chart_type: str = Field(..., min_length=1)
    columns: list[str] = Field(..., min_length=1)
    chart_config: dict = {}


class StatisticalAnalysisRequest(BaseModel):
    analysis_type: str = Field(..., min_length=1)
    columns: list[str] = Field(..., min_length=1)
    hypothesis: Optional[str] = None


# ==================== SQL Generation with Execution ====================

class SQLWithExecutionResponse(BaseModel):
    sql: str
    explanation: str
    is_safe: bool
    estimated_rows: int
    columns: list[str]
    execution_plan: dict
    safety_checks: dict
    parameterized_version: str


# ==================== Dashboard Explanations ====================

class DashboardExplainRequest(BaseModel):
    dashboard_spec: dict
    audience: str = "analyst"


class DashboardExplanationResponse(BaseModel):
    purpose: str
    kpi_explanations: list[dict]
    chart_walkthrough: list[dict]
    usage_guide: str
    limitations: list[str]


class ChartInterpretRequest(BaseModel):
    chart_config: dict
    chart_data: dict
    business_context: str = ""


class ChartInterpretationResponse(BaseModel):
    what_it_shows: str
    key_observations: list[str]
    business_implications: list[str]
    follow_up_questions: list[str]
    caveats: list[str]


# ==================== Business Insights ====================

class BusinessInsightsRequest(BaseModel):
    business_domain: str = "general"
    key_questions: list[str] = []
    time_period: str = "Last 30 days"


class BusinessInsightsResponse(BaseModel):
    insights: list[dict]
    summary: str
    key_metrics_table: list[dict]
    strategic_themes: list[str]


# ==================== Forecasting Suggestions ====================

class ForecastingSuggestionsRequest(BaseModel):
    target_columns: list[str] = []
    business_context: str = ""
    forecast_horizon: str = "12 periods"


class ForecastingSuggestionsResponse(BaseModel):
    recommendations: list[dict]
    general_guidance: str
    data_prep_steps: list[str]


# ==================== Chat ====================

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    conversation_id: Optional[uuid.UUID] = None


class ChatMessageResponse(BaseModel):
    conversation_id: uuid.UUID
    response: str
    model: str
    provider: str
    usage: dict
    # New fields for UX upgrade
    state: str = "answer"  # "answer", "clarifying", "error"
    error_category: Optional[str] = None  # "invalid_column", "row_cap_exceeded", "ambiguous_query", "provider_unavailable", "internal_error"
    error_detail: Optional[str] = None  # Safe, user-actionable message (never internal details)


class PromptListResponse(BaseModel):
    prompts: list[dict]


class ProviderStatusResponse(BaseModel):
    current_provider: Optional[str]
    available_providers: list[str]
    healthy_providers: list[str]
    health_check: dict[str, bool]


# ==================== Dataset Profiling ====================

@router.post("/profile/{dataset_id}", response_model=ProfileDatasetResponse)
async def profile_dataset(
    dataset_id: uuid.UUID,
    request: ProfileDatasetRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate comprehensive dataset profile (smart analysis on upload)."""
    profile = await engine.profile_dataset_on_upload(dataset_id, current_user)

    await audit_logger.log(
        "DATASET_PROFILE",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"quality_score": profile.quality_score},
    )

    return ProfileDatasetResponse(
        dataset_id=profile.dataset_id,
        dataset_name=profile.dataset_name,
        row_count=profile.row_count,
        column_count=profile.column_count,
        quality_score=profile.quality_score,
        completeness=profile.completeness,
        consistency=profile.consistency,
        accuracy=profile.accuracy,
        business_summary=profile.business_summary,
        suggested_charts=profile.suggested_charts,
        suggested_kpis=profile.suggested_kpis,
        suggested_dashboards=profile.suggested_dashboards,
        generated_at=profile.generated_at.isoformat(),
    )


# ==================== Data Quality ====================

@router.get("/quality/{dataset_id}", response_model=DataQualityResponse)
async def assess_data_quality(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Assess data quality with detailed scoring and issues."""
    quality = await engine.assess_data_quality(dataset_id, current_user)

    await audit_logger.log(
        "DATA_QUALITY_ASSESSMENT",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"overall_score": quality.overall_score},
    )

    return DataQualityResponse(
        dataset_id=quality.dataset_id,
        overall_score=quality.overall_score,
        completeness=quality.completeness,
        consistency=quality.consistency,
        accuracy=quality.accuracy,
        validity=quality.validity,
        uniqueness=quality.uniqueness,
        issues=quality.issues,
        suggestions=quality.suggestions,
        column_scores=quality.column_scores,
    )


# ==================== Automatic Insights ====================

@router.get("/insights/{dataset_id}", response_model=InsightsResponse)
async def generate_insights(
    dataset_id: uuid.UUID,
    max_insights: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate intelligent, ranked insights for a dataset."""
    insights = await engine.generate_insights(dataset_id, current_user, max_insights)

    await audit_logger.log(
        "AI_INSIGHTS_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"insight_count": len(insights.insights)},
    )

    return InsightsResponse(
        dataset_id=insights.dataset_id,
        insights=[InsightResponse(**i.model_dump()) for i in insights.insights],
        summary=insights.summary,
        generated_at=insights.generated_at.isoformat(),
    )


# ==================== AI Data Cleaning ====================

@router.get("/cleaning/plan/{dataset_id}", response_model=CleaningPlanRequest)
async def suggest_cleaning_plan(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate executable data cleaning plan."""
    plan = await engine.suggest_cleaning_plan(dataset_id, current_user)

    return CleaningPlanRequest(
        steps=[CleaningStepRequest(**s.model_dump()) for s in plan.steps],
        execution_order=plan.execution_order,
        rollback_plan=plan.rollback_plan,
        validation_queries=plan.validation_queries,
    )


@router.post("/cleaning/execute/{dataset_id}", response_model=CleaningExecuteResponse)
async def execute_cleaning_plan(
    dataset_id: uuid.UUID,
    plan: CleaningPlanRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Execute a data cleaning plan (one-click cleaning)."""
    from app.services.ai_gateway.analytics.engine import CleaningPlan, CleaningAction

    cleaning_plan = CleaningPlan(
        steps=[CleaningAction(**s.model_dump()) for s in plan.steps],
        execution_order=plan.execution_order,
        rollback_plan=plan.rollback_plan,
        validation_queries=plan.validation_queries,
    )

    result = await engine.execute_cleaning_plan(dataset_id, current_user, cleaning_plan)

    await audit_logger.log(
        "DATA_CLEANING_EXECUTED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"steps": len(plan.steps), "rows_affected": result.get("rows_affected", 0)},
    )

    return CleaningExecuteResponse(**result)


# ==================== Predictive Analytics ====================

@router.post("/forecast/{dataset_id}", response_model=ForecastResponse)
async def forecast(
    dataset_id: uuid.UUID,
    request: ForecastRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate time series forecast."""
    forecast = await engine.forecast(
        dataset_id,
        current_user,
        request.date_column,
        request.value_column,
        request.periods,
        request.confidence,
    )

    await audit_logger.log(
        "FORECAST_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"model": forecast.model, "periods": request.periods},
    )

    return ForecastResponse(
        model=forecast.model,
        forecast=forecast.forecast,
        accuracy_metrics=forecast.accuracy_metrics,
        trend=forecast.trend,
        seasonality_detected=forecast.seasonality_detected,
        assumptions=forecast.assumptions,
        risks=forecast.risks,
    )


# ==================== Anomaly Detection ====================

@router.get("/anomalies/{dataset_id}", response_model=AnomalyResponse)
async def detect_anomalies(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Detect anomalies, outliers, and fraud indicators."""
    anomalies = await engine.detect_anomalies(dataset_id, current_user)

    await audit_logger.log(
        "ANOMALY_DETECTION",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={
            "point_anomalies": len(anomalies.point_anomalies),
            "fraud_indicators": len(anomalies.fraud_indicators),
        },
    )

    return AnomalyResponse(
        point_anomalies=anomalies.point_anomalies,
        contextual_anomalies=anomalies.contextual_anomalies,
        collective_anomalies=anomalies.collective_anomalies,
        fraud_indicators=anomalies.fraud_indicators,
        summary=anomalies.summary,
    )


# ==================== Chart Recommendation ====================

@router.get("/charts/recommend/{dataset_id}", response_model=ChartRecommendationsResponse)
async def recommend_charts(
    dataset_id: uuid.UUID,
    analysis_goal: str = Query("exploratory", pattern="^(exploratory|presentation|monitoring|comparison)$"),
    audience: str = Query("analyst", pattern="^(analyst|executive|technical|general)$"),
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Recommend optimal visualizations for a dataset."""
    recommendations = await engine.recommend_charts(
        dataset_id, current_user, analysis_goal, audience
    )

    return ChartRecommendationsResponse(
        recommendations=[ChartRecommendationResponse(**c.model_dump()) for c in recommendations.recommendations],
        dashboard_layout=recommendations.dashboard_layout,
        color_scheme=recommendations.color_scheme,
        accessibility_notes=recommendations.accessibility_notes,
    )


# ==================== Natural Language Query ====================

@router.post("/nlq/{dataset_id}", response_model=NLQueryResponse)
async def natural_language_query(
    dataset_id: uuid.UUID,
    request: NLQueryRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Convert natural language to safe SQL."""
    result = await engine.natural_language_to_sql(dataset_id, current_user, request.question)

    await audit_logger.log(
        "NL_TO_SQL",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"is_safe": result.is_safe},
    )

    return NLQueryResponse(
        sql=result.sql,
        explanation=result.explanation,
        is_safe=result.is_safe,
        estimated_rows=result.estimated_rows,
        columns=result.columns,
    )


@router.post("/sql/explain", response_model=SQLExplainResponse)
async def explain_sql(
    dataset_id: uuid.UUID,
    request: SQLExplainRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Explain SQL query in plain language."""
    explanation = await engine.explain_sql(dataset_id, current_user, request.sql)
    return SQLExplainResponse(explanation=explanation)


# ==================== Report Generation ====================

@router.post("/reports/{dataset_id}", response_model=ReportResponse)
async def generate_report(
    dataset_id: uuid.UUID,
    request: ReportRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate executive, technical, or business report."""
    if request.report_type == "executive":
        report = await engine.generate_executive_report(dataset_id, current_user, request.time_period)
    elif request.report_type == "technical":
        report = await engine.generate_technical_report(dataset_id, current_user)
    elif request.report_type == "business":
        report = await engine.generate_business_report(dataset_id, current_user)
    else:
        raise ValueError(f"Unknown report type: {request.report_type}")

    await audit_logger.log(
        "REPORT_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"report_type": request.report_type},
    )

    return ReportResponse(
        title=report.title,
        content=report.content,
        format=report.format,
        generated_at=report.generated_at.isoformat(),
    )


# ==================== Dashboard Generation ====================

@router.post("/dashboard/{dataset_id}", response_model=DashboardResponse)
async def generate_dashboard(
    dataset_id: uuid.UUID,
    request: DashboardRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate complete dashboard specification."""
    dashboard = await engine.generate_dashboard(
        dataset_id,
        current_user,
        request.business_context,
        request.user_roles,
        request.key_questions,
    )

    await audit_logger.log(
        "DASHBOARD_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
    )

    return DashboardResponse(
        dashboard=dashboard.dashboard,
        kpis=dashboard.kpis,
        charts=dashboard.charts,
        filters=dashboard.filters,
        tabs=dashboard.tabs,
        insights_panel=dashboard.insights_panel,
        export_enabled=dashboard.export_enabled,
    )


# ==================== Python Code Generation ====================

@router.post("/python/code/{dataset_id}", response_model=PythonCodeResponse)
async def generate_python_code(
    dataset_id: uuid.UUID,
    request: PythonCodeRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate Python code for data analysis task."""
    result = await engine.generate_python_code(dataset_id, current_user, request.task_description, request.libraries)

    await audit_logger.log(
        "PYTHON_CODE_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"task": request.task_description[:100]},
    )

    return PythonCodeResponse(**result.model_dump())


@router.post("/python/pipeline/{dataset_id}", response_model=PythonCodeResponse)
async def generate_analysis_pipeline(
    dataset_id: uuid.UUID,
    request: AnalysisPipelineRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate complete end-to-end analysis pipeline in Python."""
    result = await engine.generate_analysis_pipeline(dataset_id, current_user, request.analysis_goals, request.target_column)

    await audit_logger.log(
        "PYTHON_PIPELINE_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"goals": request.analysis_goals[:100]},
    )

    return PythonCodeResponse(**result.model_dump())


@router.post("/python/visualization/{dataset_id}", response_model=PythonCodeResponse)
async def generate_visualization_code(
    dataset_id: uuid.UUID,
    request: VisualizationCodeRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate Python code for specific visualization."""
    result = await engine.generate_visualization_code(dataset_id, current_user, request.chart_type, request.columns, request.chart_config)

    await audit_logger.log(
        "PYTHON_VIZ_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"chart_type": request.chart_type, "columns": request.columns},
    )

    return PythonCodeResponse(**result.model_dump())


@router.post("/python/statistical/{dataset_id}", response_model=PythonCodeResponse)
async def generate_statistical_analysis_code(
    dataset_id: uuid.UUID,
    request: StatisticalAnalysisRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate Python code for statistical analysis."""
    result = await engine.generate_statistical_analysis_code(dataset_id, current_user, request.analysis_type, request.columns, request.hypothesis)

    await audit_logger.log(
        "PYTHON_STATS_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"analysis_type": request.analysis_type, "columns": request.columns},
    )

    return PythonCodeResponse(**result.model_dump())


# ==================== SQL Generation with Execution ====================

@router.post("/sql/generate-with-execution/{dataset_id}", response_model=SQLWithExecutionResponse)
async def generate_sql_with_execution(
    dataset_id: uuid.UUID,
    request: NLQueryRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate SQL with execution plan and safety checks."""
    result = await engine.generate_sql_with_execution(dataset_id, current_user, request.question)

    await audit_logger.log(
        "SQL_WITH_EXECUTION_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"question": request.question[:100], "is_safe": result.is_safe},
    )

    return SQLWithExecutionResponse(**result.model_dump())


# ==================== Dashboard Explanations ====================

@router.post("/dashboard/explain/{dataset_id}", response_model=DashboardExplanationResponse)
async def explain_dashboard(
    dataset_id: uuid.UUID,
    request: DashboardExplainRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Explain dashboard in plain language for business users."""
    result = await engine.explain_dashboard(dataset_id, current_user, request.dashboard_spec, request.audience)

    await audit_logger.log(
        "DASHBOARD_EXPLAINED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
    )

    return DashboardExplanationResponse(**result.model_dump())


@router.post("/chart/interpret/{dataset_id}", response_model=ChartInterpretationResponse)
async def interpret_chart(
    dataset_id: uuid.UUID,
    request: ChartInterpretRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Interpret a specific chart and provide insights."""
    result = await engine.interpret_chart(dataset_id, current_user, request.chart_config, request.chart_data, request.business_context)

    await audit_logger.log(
        "CHART_INTERPRETED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
    )

    return ChartInterpretationResponse(**result.model_dump())


# ==================== Business Insights ====================

@router.post("/insights/business/{dataset_id}", response_model=BusinessInsightsResponse)
async def generate_business_insights(
    dataset_id: uuid.UUID,
    request: BusinessInsightsRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Generate deep business insights with strategic recommendations."""
    result = await engine.generate_business_insights(dataset_id, current_user, request.business_domain, request.key_questions, request.time_period)

    await audit_logger.log(
        "BUSINESS_INSIGHTS_GENERATED",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"domain": request.business_domain, "insight_count": len(result.insights)},
    )

    return BusinessInsightsResponse(**result.model_dump())


# ==================== Forecasting Suggestions ====================

@router.post("/forecast/suggestions/{dataset_id}", response_model=ForecastingSuggestionsResponse)
async def suggest_forecasting_approach(
    dataset_id: uuid.UUID,
    request: ForecastingSuggestionsRequest,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Recommend forecasting approaches for the dataset."""
    result = await engine.suggest_forecasting_approach(dataset_id, current_user, request.target_columns, request.business_context, request.forecast_horizon)

    await audit_logger.log(
        "FORECASTING_SUGGESTIONS",
        "dataset",
        str(dataset_id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={"target_columns": request.target_columns, "horizon": request.forecast_horizon},
    )

    return ForecastingSuggestionsResponse(**result.model_dump())


# ==================== Conversational AI ====================

@router.post("/chat/{dataset_id}", response_model=ChatMessageResponse)
async def chat_about_dataset(
    dataset_id: uuid.UUID,
    request: ChatMessageRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Chat with AI about a dataset with conversation memory."""
    
    # Rate limiting for AI chat (30 requests per minute per user)
    await rate_limit_dependency("30/minute", "ai_chat", http_request)
    
    # Prompt injection detection
    injection = detect_prompt_injection(request.message)
    if injection:
        await audit_logger.log(
            "AI_CHAT_INJECTION_DETECTED",
            "dataset",
            str(dataset_id),
            str(current_user.id),
            str(current_user.tenant_id) if current_user.tenant_id else None,
            details={"injection_pattern": injection, "message_preview": request.message[:200]},
        )
        # Don't block, but flag for review - the message will be flagged in the conversation
        # Could also raise HTTPException(status_code=400, detail="Potential prompt injection detected")
    
    try:
        result = await engine.chat_about_dataset(
            dataset_id,
            current_user,
            request.message,
            request.conversation_id,
        )
        
        await audit_logger.log(
            "AI_CHAT",
            "dataset",
            str(dataset_id),
            str(current_user.id),
            str(current_user.tenant_id) if current_user.tenant_id else None,
            details={
                "conversation_id": str(result["conversation_id"]),
                "injection_detected": injection is not None,
                "injection_pattern": injection,
            },
        )
        
        return ChatMessageResponse(
            conversation_id=result["conversation_id"],
            response=result["response"],
            model=result["model"],
            provider=result["provider"],
            usage=result["usage"],
            state=result.get("state", "answer"),
            error_category=result.get("error_category"),
            error_detail=result.get("error_detail"),
        )
    except HTTPException as e:
        # Handle specific HTTP exceptions with safe, differentiated messages
        # These are expected rejection reasons concerning the user's own request/data
        if e.status_code == 400:
            # Could be invalid column, bad request, etc.
            # Map to safe user-facing message
            return ChatMessageResponse(
                conversation_id=request.conversation_id or uuid.uuid4(),
                response="",
                model="",
                provider="",
                usage={},
                state="error",
                error_category="invalid_column",
                error_detail="I couldn't find that column in your dataset. Please check the column name and try again.",
            )
        elif e.status_code == 413:
            return ChatMessageResponse(
                conversation_id=request.conversation_id or uuid.uuid4(),
                response="",
                model="",
                provider="",
                usage={},
                state="error",
                error_category="row_cap_exceeded",
                error_detail="This dataset is too large to analyze directly. Try filtering to a smaller subset first.",
            )
        else:
            # Other HTTP exceptions — keep generic
            return ChatMessageResponse(
                conversation_id=request.conversation_id or uuid.uuid4(),
                response="",
                model="",
                provider="",
                usage={},
                state="error",
                error_category="internal_error",
                error_detail="Something went wrong. Please try again.",
            )
    except RuntimeError as e:
        # ProviderManager raises RuntimeError when all providers fail
        # This is a provider availability issue, not a user error
        error_msg = str(e).lower()
        if "no ai providers available" in error_msg or "all providers failed" in error_msg:
            return ChatMessageResponse(
                conversation_id=request.conversation_id or uuid.uuid4(),
                response="",
                model="",
                provider="",
                usage={},
                state="error",
                error_category="provider_unavailable",
                error_detail="AI service is temporarily unavailable. Please try again in a moment.",
            )
        else:
            # Unexpected RuntimeError — treat as internal error
            return ChatMessageResponse(
                conversation_id=request.conversation_id or uuid.uuid4(),
                response="",
                model="",
                provider="",
                usage={},
                state="error",
                error_category="internal_error",
                error_detail="Something went wrong. Please try again.",
            )
    except AppException as e:
        # AppException messages are considered safe to surface
        # But we map to specific categories for better UX
        return ChatMessageResponse(
            conversation_id=request.conversation_id or uuid.uuid4(),
            response="",
            model="",
            provider="",
            usage={},
            state="error",
            error_category="internal_error",
            error_detail=e.message,
        )


# ==================== Streaming Chat ====================

class StreamChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    conversation_id: Optional[uuid.UUID] = None
    model: Optional[str] = None
    provider: Optional[str] = None


class StreamChatChunk(BaseModel):
    content: str
    done: bool
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    # New fields for UX upgrade
    state: Optional[str] = None  # "thinking", "clarifying", "error"
    error_category: Optional[str] = None
    error_detail: Optional[str] = None


@router.post("/chat/stream/{dataset_id}")
async def stream_chat_about_dataset(
    dataset_id: uuid.UUID,
    request: StreamChatMessageRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Stream chat with AI about a dataset with conversation memory."""
    
    # Rate limiting for AI chat (30 requests per minute per user)
    await rate_limit_dependency("30/minute", "ai_chat", http_request)
    
    # Prompt injection detection
    injection = detect_prompt_injection(request.message)
    if injection:
        await audit_logger.log(
            "AI_CHAT_INJECTION_DETECTED",
            "dataset",
            str(dataset_id),
            str(current_user.id),
            str(current_user.tenant_id) if current_user.tenant_id else None,
            details={"injection_pattern": injection, "message_preview": request.message[:200]},
        )
    
    from fastapi.responses import StreamingResponse
    import json
    
    async def generate_stream():
        try:
            # Step 1: Reading dataset
            yield "data: {\"state\": \"thinking\", \"content\": \"Reading dataset...\", \"done\": false}\n\n"
            
            # Get comprehensive dataset context using ContextBuilder
            context_builder = get_context_builder()
            dataset_context = await context_builder.build_context(dataset_id, current_user, max_sample_rows=50)
            max_context_tokens = 8000
            context_text = context_builder.to_prompt_text(dataset_context, include_full=True, max_tokens=max_context_tokens)
            
            # Step 2: Building context
            yield "data: {\"state\": \"thinking\", \"content\": \"Building context...\", \"done\": false}\n\n"
            
            # Get or create conversation
            memory = get_conversation_memory()
            conv_id: uuid.UUID
            conv_messages: list = []
            if request.conversation_id:
                conv_id = request.conversation_id
                conv_messages = await memory.get_recent_messages(conv_id, current_user, count=20)
            else:
                conv = await memory.create_conversation(
                    dataset_id=dataset_id,
                    user=current_user,
                    dataset_context=context_text,
                )
                conv_id = conv.id
            conv_id_str = str(conv_id)
            
            # Build messages
            messages = []
            for msg in conv_messages:
                messages.append(ChatMessage(role=MessageRole(msg.role), content=msg.content))
            
            system_content = f"""You are an expert AI Data Analyst. The user is asking questions about a dataset.
            
{context_text}
            
Instructions:
- Use the dataset context above to answer questions accurately
- Reference specific columns, statistics, and patterns from the context
- If the user asks for analysis you cannot perform directly, explain what analysis would be needed
- Be specific and actionable in your responses
- If you detect data quality issues, mention them"""
            messages.insert(0, ChatMessage(role=MessageRole.SYSTEM, content=system_content))
            messages.append(ChatMessage(role=MessageRole.USER, content=request.message))
            
            # Check for ambiguity before generating full response
            from app.services.ai_gateway.analytics.engine import AIAnalyticsEngine
            engine = get_ai_analytics_engine()
            df = _load_dataframe(dataset_context.dataset.file_path) if hasattr(dataset_context, 'dataset') else None
            if df is not None:
                clarifying = await engine._check_for_clarification(request.message, df, engine._prepare_dataset_context(df))
                if clarifying:
                    # Send clarifying question as a complete message
                    yield f"data: {StreamChatChunk(content=clarifying, done=False, conversation_id=conv_id_str, state='clarifying').model_dump_json()}\n\n"
                    yield f"data: {StreamChatChunk(content='', done=True, conversation_id=conv_id_str, state='clarifying').model_dump_json()}\n\n"
                    yield "data: [DONE]\n\n"
                    return
            
            # Step 3: Thinking (LLM call)
            yield "data: {\"state\": \"thinking\", \"content\": \"Thinking...\", \"done\": false}\n\n"
            
            # Stream from gateway
            gateway = get_ai_gateway()
            received_model = None
            received_provider = None
            
            # Store user message
            await memory.add_message(
                conversation_id=conv_id,
                role=MessageRole.USER,
                content=request.message,
                user=current_user,
                model="",
                provider="",
                tokens_prompt=0,
                tokens_completion=0,
                duration_ms=0,
                dataset_id=dataset_id,
            )
            
            full_response = ""
            
            async for chunk in gateway.stream_chat(
                messages=messages,
                tenant_id=current_user.tenant_id,
                user_id=current_user.id,
                model=request.model,
                provider_type=ProviderType(request.provider) if request.provider else None,
            ):
                if chunk.content:
                    # Send chunk as SSE
                    data = StreamChatChunk(
                        content=chunk.content,
                        done=False,
                        conversation_id=conv_id_str,
                        model=chunk.model,
                        provider=chunk.provider.value,
                    )
                    yield f"data: {data.model_dump_json()}\n\n"
                
                if chunk.is_final:
                    received_model = chunk.model
                    received_provider = chunk.provider.value
                    break
            
            # Step 4: Checking results
            yield "data: {\"state\": \"thinking\", \"content\": \"Checking results...\", \"done\": false}\n\n"
            
            # Store assistant message
            await memory.add_message(
                conversation_id=conv_id,
                role=MessageRole.ASSISTANT,
                content="",  # Content is streamed, stored in chunks
                user=current_user,
                model=received_model or "",
                provider=received_provider or "",
                tokens_prompt=0,
                tokens_completion=0,
                duration_ms=0,
                dataset_id=dataset_id,
            )
            
            # Send final chunk
            final_data = StreamChatChunk(
                content="",
                done=True,
                conversation_id=conv_id_str,
                model=received_model,
                provider=received_provider,
            )
            yield f"data: {final_data.model_dump_json()}\n\n"
            yield "data: [DONE]\n\n"
            
        except HTTPException as e:
            # Handle specific HTTP exceptions with safe, differentiated messages
            if e.status_code == 400:
                error_chunk = StreamChatChunk(
                    content="", done=True, conversation_id=request.conversation_id and str(request.conversation_id),
                    state="error", error_category="invalid_column",
                    error_detail="I couldn't find that column in your dataset. Please check the column name and try again.",
                )
            elif e.status_code == 413:
                error_chunk = StreamChatChunk(
                    content="", done=True, conversation_id=request.conversation_id and str(request.conversation_id),
                    state="error", error_category="row_cap_exceeded",
                    error_detail="This dataset is too large to analyze directly. Try filtering to a smaller subset first.",
                )
            else:
                error_chunk = StreamChatChunk(
                    content="", done=True, conversation_id=request.conversation_id and str(request.conversation_id),
                    state="error", error_category="internal_error",
                    error_detail="Something went wrong. Please try again.",
                )
            yield f"data: {error_chunk.model_dump_json()}\n\n"
            yield "data: [DONE]\n\n"
        except RuntimeError as e:
            error_msg = str(e).lower()
            if "no ai providers available" in error_msg or "all providers failed" in error_msg:
                error_chunk = StreamChatChunk(
                    content="", done=True, conversation_id=request.conversation_id and str(request.conversation_id),
                    state="error", error_category="provider_unavailable",
                    error_detail="AI service is temporarily unavailable. Please try again in a moment.",
                )
            else:
                error_chunk = StreamChatChunk(
                    content="", done=True, conversation_id=request.conversation_id and str(request.conversation_id),
                    state="error", error_category="internal_error",
                    error_detail="Something went wrong. Please try again.",
                )
            yield f"data: {error_chunk.model_dump_json()}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            # Log the full error server-side but send generic message to client
            logger.exception("Streaming chat error", extra={"request_id": getattr(http_request.state, 'request_id', None)})
            error_chunk = StreamChatChunk(
                content="", done=True, conversation_id=request.conversation_id and str(request.conversation_id),
                state="error", error_category="internal_error",
                error_detail="Something went wrong. Please try again.",
            )
            yield f"data: {error_chunk.model_dump_json()}\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/history/{conversation_id}")
async def get_chat_history(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    memory: ConversationMemory = Depends(get_conversation_memory),
):
    """Get conversation history."""
    messages = await memory.get_messages(conversation_id, current_user)
    return [msg.to_dict() for msg in messages]


@router.get("/chat/conversations/{dataset_id}")
async def list_conversations(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    memory: ConversationMemory = Depends(get_conversation_memory),
):
    """List conversations for a dataset."""
    summaries = await memory.list_conversations(dataset_id, current_user)
    return [s.to_dict() for s in summaries]


# ==================== Prompt Library ====================

@router.get("/prompts", response_model=PromptListResponse)
async def list_prompts(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    prompts: PromptLibrary = Depends(get_prompt_library),
):
    """List available prompt templates."""
    cat = None
    if category:
        from app.services.ai_gateway.prompts.library import PromptCategory
        try:
            cat = PromptCategory(category)
        except ValueError:
            pass

    prompt_list = prompts.list_prompts(category=cat)
    return PromptListResponse(
        prompts=[
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "category": p.category.value,
                "variables": p.variables,
                "output_format": p.output_format.value,
                "tags": p.tags,
            }
            for p in prompt_list
        ]
    )


@router.get("/prompts/{prompt_id}")
async def get_prompt(
    prompt_id: str,
    current_user: User = Depends(get_current_user),
    prompts: PromptLibrary = Depends(get_prompt_library),
):
    """Get prompt template details."""
    prompt = prompts.get_prompt(prompt_id)
    if not prompt:
        return {"error": "Prompt not found"}, 404

    return {
        "id": prompt.id,
        "name": prompt.name,
        "description": prompt.description,
        "category": prompt.category.value,
        "template": prompt.template,
        "variables": prompt.variables,
        "output_format": prompt.output_format.value,
        "system_prompt": prompt.system_prompt,
        "example_input": prompt.example_input,
        "example_output": prompt.example_output,
        "tags": prompt.tags,
        "version": prompt.version,
    }


# ==================== Provider Management ====================

@router.get("/providers/status", response_model=ProviderStatusResponse)
async def provider_status(
    current_user: User = Depends(get_current_user),
    gateway: AIGateway = Depends(get_ai_gateway),
):
    """Get AI provider status and health."""
    health = await gateway.health_check()

    return ProviderStatusResponse(
        current_provider=gateway.get_current_provider().value if gateway.get_current_provider() else None,
        available_providers=[p.value for p in gateway.get_available_providers()],
        healthy_providers=[p.value for p in gateway.get_healthy_providers()],
        health_check={k.value: v for k, v in health.items()},
    )


@router.post("/providers/switch")
async def switch_provider(
    provider: str,
    current_user: User = Depends(get_current_user),
    gateway: AIGateway = Depends(get_ai_gateway),
):
    """Manually switch AI provider."""
    try:
        provider_type = ProviderType(provider)
    except ValueError:
        return {"error": f"Unknown provider: {provider}"}, 400

    # Test the provider
    try:
        await gateway.chat(
            messages=[ChatMessage(role=MessageRole.USER, content="test")],
            provider_type=provider_type,
            config=GenerationConfig(max_tokens=10),
        )
        return {"message": f"Switched to {provider}", "provider": provider}
    except Exception as e:
        return {"error": f"Failed to switch to {provider}: {str(e)}"}, 500