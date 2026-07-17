import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_verified
from app.core.security.audit import audit_logger
from app.models.analysis import AnalysisRun
from app.models.dataset import Dataset
from app.models.user import User
from app.schemas.analytics import (
    AIInsightResponse,
    AnalysisReport,
    AnalysisRunResponse,
    ColumnProfile,
    CorrelationResponse,
    DatasetProfileResponse,
    InsightItem,
    ReportSection,
    TaskResponse,
)
from app.services.ai_analytics_service import AIAnalyticsService
from app.services.analytics_service import AnalyticsService
from app.tasks.analytics_tasks import (
    ai_insights_task,
    comprehensive_analysis_task,
    correlate_dataset_task,
    profile_dataset_task,
)

router = APIRouter()


@router.get("/stats")
async def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    dataset_count = await db.scalar(
        select(func.count()).select_from(Dataset).where(Dataset.user_id == current_user.id, Dataset.deleted_at.is_(None))
    )
    run_count = await db.scalar(
        select(func.count()).select_from(AnalysisRun).where(AnalysisRun.user_id == current_user.id)
    )
    return {
        "total_datasets": dataset_count or 0,
        "total_analysis_runs": run_count or 0,
    }


@router.post("/profile/{dataset_id}", response_model=DatasetProfileResponse | TaskResponse)
async def profile_dataset(
    dataset_id: uuid.UUID,
    force: bool = Query(False),
    async_mode: bool = Query(False, alias="async"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
    db: AsyncSession = Depends(get_session),
):
    did = str(dataset_id)
    if async_mode:
        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=dataset_id,
            user_id=current_user.id,
            analysis_type="profile",
            status="pending",
        )
        db.add(run)
        await db.flush()

        profile_dataset_task.delay(str(run.id), did, str(current_user.id), force)
        return TaskResponse(run_id=run.id, status="pending", message="Profile task queued")

    profiles = await analytics_service.run_profile(did, current_user, force=force)
    ds = (
        profiles[0].dataset if profiles else await analytics_service._get_dataset(did, current_user)
    )
    await audit_logger.create("profile", did, str(current_user.id))
    return DatasetProfileResponse(
        dataset_id=ds.id,
        dataset_name=ds.name,
        row_count=ds.row_count or 0,
        column_count=len(profiles),
        columns=[
            ColumnProfile(
                column_name=p.column_name,
                dtype=p.dtype,
                null_count=p.null_count,
                total_count=p.total_count,
                null_percent=round(p.null_count / max(p.total_count, 1) * 100, 2),
                unique_count=p.unique_count,
                unique_percent=round(p.unique_count / max(p.total_count, 1) * 100, 2),
                min_val=p.min_val,
                max_val=p.max_val,
                mean=p.mean,
                median=p.median,
                std=p.std,
                top_values=p.top_values,
                histogram=p.histogram,
            )
            for p in profiles
        ],
        generated_at=profiles[0].created_at if profiles else ds.created_at,
    )


@router.get("/profile/{dataset_id}", response_model=DatasetProfileResponse)
async def get_profile(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
):
    did = str(dataset_id)
    profiles = await analytics_service.get_profiles(did, current_user)
    if not profiles:
        raise HTTPException(status_code=404, detail="No profile found. Run profiling first.")
    ds = profiles[0].dataset
    return DatasetProfileResponse(
        dataset_id=ds.id,
        dataset_name=ds.name,
        row_count=ds.row_count or 0,
        column_count=len(profiles),
        columns=[
            ColumnProfile(
                column_name=p.column_name,
                dtype=p.dtype,
                null_count=p.null_count,
                total_count=p.total_count,
                null_percent=round(p.null_count / max(p.total_count, 1) * 100, 2),
                unique_count=p.unique_count,
                unique_percent=round(p.unique_count / max(p.total_count, 1) * 100, 2),
                min_val=p.min_val,
                max_val=p.max_val,
                mean=p.mean,
                median=p.median,
                std=p.std,
                top_values=p.top_values,
                histogram=p.histogram,
            )
            for p in profiles
        ],
        generated_at=profiles[0].created_at,
    )


@router.post("/correlate/{dataset_id}", response_model=CorrelationResponse | TaskResponse)
async def correlate_dataset(
    dataset_id: uuid.UUID,
    async_mode: bool = Query(False, alias="async"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
    db: AsyncSession = Depends(get_session),
):
    did = str(dataset_id)
    if async_mode:
        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=dataset_id,
            user_id=current_user.id,
            analysis_type="correlation",
            status="pending",
        )
        db.add(run)
        await db.flush()

        correlate_dataset_task.delay(str(run.id), did, str(current_user.id))
        return TaskResponse(run_id=run.id, status="pending", message="Correlation task queued")

    result = await analytics_service.run_correlation_analysis(did, current_user)
    await audit_logger.create("correlation", did, str(current_user.id))
    data = result.data
    return CorrelationResponse(
        dataset_id=did,
        numeric_columns=data["numeric_columns"],
        correlations=data["correlations"],
        matrix=data["matrix"]["values"],
    )


@router.post("/insights/{dataset_id}", response_model=AIInsightResponse | TaskResponse)
async def generate_ai_insights(
    dataset_id: uuid.UUID,
    async_mode: bool = Query(False, alias="async"),
    current_user: User = Depends(require_verified),
    ai_service: AIAnalyticsService = Depends(),
    db: AsyncSession = Depends(get_session),
):
    did = str(dataset_id)
    if async_mode:
        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=dataset_id,
            user_id=current_user.id,
            analysis_type="ai_insight",
            status="pending",
        )
        db.add(run)
        await db.flush()

        ai_insights_task.delay(str(run.id), did, str(current_user.id))
        return TaskResponse(run_id=run.id, status="pending", message="AI insight task queued")

    result = await ai_service.generate_insights(did, current_user)
    await audit_logger.create("ai_insight", did, str(current_user.id))
    data = result.data
    return AIInsightResponse(
        dataset_id=did,
        dataset_name=data["dataset_name"],
        summary=data["summary"],
        insights=[InsightItem(**i) for i in data["insights"]],
        generated_at=result.created_at,
    )


@router.get("/insights/{dataset_id}", response_model=AIInsightResponse)
async def get_ai_insights(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    ai_service: AIAnalyticsService = Depends(),
):
    did = str(dataset_id)
    result = await ai_service.get_insights(did, current_user)
    if result is None:
        raise HTTPException(status_code=404, detail="No AI insights found. Generate them first.")
    data = result.data
    return AIInsightResponse(
        dataset_id=did,
        dataset_name=data["dataset_name"],
        summary=data["summary"],
        insights=[InsightItem(**i) for i in data["insights"]],
        generated_at=result.created_at,
    )


@router.post("/analyze/{dataset_id}")
async def analyze_dataset(
    dataset_id: uuid.UUID,
    async_mode: bool = Query(False, alias="async"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
    db: AsyncSession = Depends(get_session),
):
    did = str(dataset_id)
    if async_mode:
        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=dataset_id,
            user_id=current_user.id,
            analysis_type="comprehensive",
            status="pending",
        )
        db.add(run)
        await db.flush()

        comprehensive_analysis_task.delay(str(run.id), did, str(current_user.id))
        return TaskResponse(run_id=run.id, status="pending", message="Analysis task queued")

    result = await analytics_service.run_full_analysis(did, current_user)
    await audit_logger.create("analysis_report", did, str(current_user.id))
    data = result.data
    sections_data = data.get("sections", [])

    profiles = []
    correlations = None
    for s in sections_data:
        if s["type"] == "profiles":
            profiles = [ColumnProfile(**c) for c in s["content"]]
        elif s["type"] == "correlations":
            correlations = s["content"]

    return AnalysisReport(
        dataset_id=data["dataset_id"],
        dataset_name=data["dataset_name"],
        row_count=data["row_count"],
        column_count=data["column_count"],
        generated_at=result.created_at,
        profile=profiles,
        correlations=correlations,
        sections=[ReportSection(**s) for s in sections_data],
    )


@router.get("/report/{dataset_id}", response_model=AnalysisReport)
async def get_report(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
):
    did = str(dataset_id)
    result = await analytics_service.get_report(did, current_user)
    if result is None:
        raise HTTPException(status_code=404, detail="No report found. Run analysis first.")
    data = result.data
    sections_data = data.get("sections", [])

    profiles = []
    correlations = None

    for s in sections_data:
        if s["type"] == "profiles":
            profiles = [ColumnProfile(**c) for c in s["content"]]
        elif s["type"] == "correlations":
            correlations = s["content"]

    return AnalysisReport(
        dataset_id=data["dataset_id"],
        dataset_name=data["dataset_name"],
        row_count=data["row_count"],
        column_count=data["column_count"],
        generated_at=result.created_at,
        profile=profiles,
        correlations=correlations,
        sections=[ReportSection(**s) for s in sections_data],
    )


@router.get("/runs", response_model=list[AnalysisRunResponse])
async def list_runs(
    dataset_id: str = Query(None),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
):
    runs = await analytics_service.list_runs(dataset_id, current_user)
    return runs


@router.get("/runs/{run_id}", response_model=AnalysisRunResponse)
async def get_run(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
):
    return await analytics_service.get_run(str(run_id), current_user)
