from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.visualization import VizColumnRequest, VizMultiColumnRequest, VizTwoColumnRequest
from app.services.chart_renderer import ChartRendererService

router = APIRouter()


@router.get("/png/bar/{dataset_id}")
async def bar_png(
    dataset_id: str,
    column: str = Query(...),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: ChartRendererService = Depends(),
) -> StreamingResponse:
    return await service.render_bar(dataset_id, column, current_user, limit)


@router.get("/png/histogram/{dataset_id}")
async def histogram_png(
    dataset_id: str,
    column: str = Query(...),
    bins: int = Query(20, ge=5, le=100),
    current_user: User = Depends(get_current_user),
    service: ChartRendererService = Depends(),
) -> StreamingResponse:
    return await service.render_histogram(dataset_id, column, current_user, bins)


@router.get("/png/scatter/{dataset_id}")
async def scatter_png(
    dataset_id: str,
    x_column: str = Query(...),
    y_column: str = Query(...),
    limit: int = Query(1000, ge=1, le=10000),
    current_user: User = Depends(get_current_user),
    service: ChartRendererService = Depends(),
) -> StreamingResponse:
    return await service.render_scatter(dataset_id, x_column, y_column, current_user, limit)


@router.get("/png/heatmap/{dataset_id}")
async def heatmap_png(
    dataset_id: str,
    columns: str = Query(..., description="Comma-separated column names"),
    current_user: User = Depends(get_current_user),
    service: ChartRendererService = Depends(),
) -> StreamingResponse:
    cols = [c.strip() for c in columns.split(",") if c.strip()]
    return await service.render_heatmap(dataset_id, cols, current_user)


@router.get("/png/pie/{dataset_id}")
async def pie_png(
    dataset_id: str,
    column: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    service: ChartRendererService = Depends(),
) -> StreamingResponse:
    return await service.render_pie(dataset_id, column, current_user, limit)
