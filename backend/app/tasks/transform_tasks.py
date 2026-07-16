import asyncio
import traceback

from app.core.celery_app import celery_app
from app.core.database import async_session_factory
from app.models.user import User
from app.services.transform_service import TransformService


async def _run_apply_transforms(
    dataset_id: str,
    user_id: str,
    output_name: str,
) -> str | None:
    async with async_session_factory() as db:
        try:
            user = await db.get(User, user_id)
            if user is None:
                return None

            svc = TransformService(db=db)
            new_ds = await svc.apply_transforms(dataset_id, user, output_name)
            return str(new_ds.id)

        except Exception:
            traceback.print_exc()
            return None


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def apply_transforms_task(self, dataset_id: str, user_id: str, output_name: str):
    result = asyncio.run(_run_apply_transforms(dataset_id, user_id, output_name))
    return result
