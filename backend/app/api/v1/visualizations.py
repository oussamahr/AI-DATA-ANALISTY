from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.visualization import (
    BarChartData,
    BoxData,
    DatasetPreview,
    HeatmapData,
    HistogramData,
    LineData,
    PieData,
    ScatterData,
    VizColumnRequest,
    VizGroupedRequest,
    VizMultiColumnRequest,
    VizTwoColumnRequest,
)
from app.services.visualization_service import VisualizationService

router = APIRouter()


@router.post("/bar", response_model=BarChartData)
async def bar_chart(
    data: VizColumnRequest,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.bar_chart(str(data.dataset_id), data.column, current_user, limit)


@router.post("/histogram", response_model=HistogramData)
async def histogram(
    data: VizColumnRequest,
    bins: int = Query(20, ge=5, le=100),
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.histogram(str(data.dataset_id), data.column, current_user, bins)


@router.post("/scatter", response_model=ScatterData)
async def scatter(
    data: VizTwoColumnRequest,
    limit: int = Query(1000, ge=1, le=10000),
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.scatter_plot(
        str(data.dataset_id), data.x_column, data.y_column, current_user, limit
    )


@router.post("/line", response_model=LineData)
async def line_chart(
    data: VizTwoColumnRequest,
    limit: int = Query(1000, ge=1, le=10000),
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.line_chart(
        str(data.dataset_id), data.x_column, data.y_column, current_user, limit
    )


@router.post("/heatmap", response_model=HeatmapData)
async def heatmap(
    data: VizMultiColumnRequest,
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.heatmap(str(data.dataset_id), data.columns, current_user)


@router.post("/pie", response_model=PieData)
async def pie_chart(
    data: VizColumnRequest,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.pie_chart(str(data.dataset_id), data.column, current_user, limit)


@router.post("/box", response_model=BoxData)
async def box_plot(
    data: VizMultiColumnRequest,
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.box_plot(str(data.dataset_id), data.columns, current_user)


@router.post("/grouped-bar", response_model=BarChartData)
async def grouped_bar(
    data: VizGroupedRequest,
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.grouped_bar(
        str(data.dataset_id), data.value_column, data.group_column, data.agg, current_user
    )


@router.get("/preview/{dataset_id}", response_model=DatasetPreview)
async def preview(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(),
):
    return await service.dataset_preview(dataset_id, current_user)
