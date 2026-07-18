"""
AI Analytics API Routes.

Provides endpoints for all advanced AI-powered analytics features.
"""

import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_verified
from app.core.security.audit import audit_logger
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
from app.services.ai_gateway.memory import ConversationMemory, get_conversation_memory
from app.services.ai_gateway.prompts import PromptLibrary, get_prompt_library

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


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    conversation_id: Optional[uuid.UUID] = None


class ChatMessageResponse(BaseModel):
    conversation_id: uuid.UUID
    response: str
    model: str
    provider: str
    usage: dict


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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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
    current_user: User = Depends(require_verified),
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


# ==================== Conversational AI ====================

@router.post("/chat/{dataset_id}", response_model=ChatMessageResponse)
async def chat_about_dataset(
    dataset_id: uuid.UUID,
    request: ChatMessageRequest,
    current_user: User = Depends(require_verified),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    """Chat with AI about a dataset with conversation memory."""
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
        details={"conversation_id": str(result["conversation_id"])},
    )

    return ChatMessageResponse(
        conversation_id=result["conversation_id"],
        response=result["response"],
        model=result["model"],
        provider=result["provider"],
        usage=result["usage"],
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
    current_user: User = Depends(require_verified),
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