from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user, require_verified
from app.models.user import User
from app.services.export_service import ExportService

router = APIRouter()


@router.get("/profile/{dataset_id}")
async def export_profile(
    dataset_id: str,
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    current_user: User = Depends(get_current_user),
    service: ExportService = Depends(),
):
    return await service.export_profile(dataset_id, current_user, format)


@router.get("/correlations/{dataset_id}")
async def export_correlations(
    dataset_id: str,
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    current_user: User = Depends(get_current_user),
    service: ExportService = Depends(),
):
    return await service.export_correlations(dataset_id, current_user, format)


@router.get("/report/{dataset_id}")
async def export_report(
    dataset_id: str,
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    current_user: User = Depends(get_current_user),
    service: ExportService = Depends(),
):
    return await service.export_report(dataset_id, current_user, format)


@router.get("/insights/{dataset_id}")
async def export_insights(
    dataset_id: str,
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    current_user: User = Depends(require_verified),
    service: ExportService = Depends(),
):
    return await service.export_insights(dataset_id, current_user, format)


@router.get("/dataset/{dataset_id}")
async def export_dataset(
    dataset_id: str,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    current_user: User = Depends(get_current_user),
    service: ExportService = Depends(),
):
    return await service.export_dataset(dataset_id, current_user, format)
