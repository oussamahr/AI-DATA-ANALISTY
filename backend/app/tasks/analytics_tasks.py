import asyncio
import traceback
from datetime import UTC, datetime

from app.core.celery_app import celery_app
from app.core.database import async_session_factory
from app.models.analysis import AnalysisRun
from app.models.user import User
from app.services.ai_analytics_service import AIAnalyticsService
from app.services.analytics_service import AnalyticsService


def _make_session():
    return async_session_factory()


async def _run_analytics_task(
    run_id: str,
    dataset_id: str,
    user_id: str,
    task_type: str,
    **kwargs,
):
    async with _make_session() as db:
        run = await db.get(AnalysisRun, run_id)
        if run is None:
            return

        try:
            user = await db.get(User, user_id)
            if user is None:
                run.status = "failed"  # type: ignore[assignment]
                run.error_message = "User not found"  # type: ignore[assignment]
                run.completed_at = datetime.now(UTC)  # type: ignore[assignment]
                await db.flush()
                return

            run.status = "running"  # type: ignore[assignment]
            await db.flush()

            if task_type == "profile":
                svc = AnalyticsService(db=db)
                await svc.run_profile(dataset_id, user, force=kwargs.get("force", False))
            elif task_type == "correlation":
                svc = AnalyticsService(db=db)
                await svc.run_correlation_analysis(dataset_id, user)
            elif task_type == "comprehensive":
                svc = AnalyticsService(db=db)
                await svc.run_full_analysis(dataset_id, user)
            elif task_type == "ai_insight":
                svc = AIAnalyticsService(db=db)
                await svc.generate_insights(dataset_id, user)

            run.status = "completed"  # type: ignore[assignment]
            run.completed_at = datetime.now(UTC)  # type: ignore[assignment]
            await db.flush()

        except Exception as e:
            run.status = "failed"  # type: ignore[assignment]
            run.error_message = str(e)  # type: ignore[assignment]
            run.completed_at = datetime.now(UTC)  # type: ignore[assignment]
            await db.flush()
            traceback.print_exc()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def profile_dataset_task(self, run_id: str, dataset_id: str, user_id: str, force: bool = False):
    asyncio.run(
        _run_analytics_task(
            run_id,
            dataset_id,
            user_id,
            "profile",
            force=force,
        )
    )


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def correlate_dataset_task(self, run_id: str, dataset_id: str, user_id: str):
    asyncio.run(
        _run_analytics_task(
            run_id,
            dataset_id,
            user_id,
            "correlation",
        )
    )


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def comprehensive_analysis_task(self, run_id: str, dataset_id: str, user_id: str):
    asyncio.run(
        _run_analytics_task(
            run_id,
            dataset_id,
            user_id,
            "comprehensive",
        )
    )


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def ai_insights_task(self, run_id: str, dataset_id: str, user_id: str):
    asyncio.run(
        _run_analytics_task(
            run_id,
            dataset_id,
            user_id,
            "ai_insight",
        )
    )
