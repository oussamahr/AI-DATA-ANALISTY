from uuid import UUID

from pydantic import BaseModel, Field


class ChartDataset(BaseModel):
    label: str
    data: list[float | int | str | None]
    border_color: str | None = None
    background_color: str | list[str] | None = None


class BarChartData(BaseModel):
    chart_type: str = "bar"
    title: str
    labels: list[str]
    datasets: list[ChartDataset]


class HistogramData(BaseModel):
    chart_type: str = "histogram"
    title: str
    bins: list[dict]
    column: str


class ScatterPoint(BaseModel):
    x: float
    y: float
    label: str | None = None


class ScatterData(BaseModel):
    chart_type: str = "scatter"
    title: str
    x_column: str
    y_column: str
    points: list[ScatterPoint]


class LineDataPoint(BaseModel):
    x: str | float
    y: float


class LineSeries(BaseModel):
    label: str
    data: list[LineDataPoint]


class LineData(BaseModel):
    chart_type: str = "line"
    title: str
    series: list[LineSeries]


class HeatmapCell(BaseModel):
    x: str
    y: str
    value: float


class HeatmapData(BaseModel):
    chart_type: str = "heatmap"
    title: str
    x_labels: list[str]
    y_labels: list[str]
    cells: list[HeatmapCell]


class PieSlice(BaseModel):
    label: str
    value: int
    percent: float


class PieData(BaseModel):
    chart_type: str = "pie"
    title: str
    slices: list[PieSlice]


class BoxData(BaseModel):
    chart_type: str = "box"
    title: str
    statistics: list[dict]


class VizColumnRequest(BaseModel):
    dataset_id: UUID
    column: str


class VizTwoColumnRequest(BaseModel):
    dataset_id: UUID
    x_column: str
    y_column: str


class VizMultiColumnRequest(BaseModel):
    dataset_id: UUID
    columns: list[str] = Field(..., min_length=1)


class VizGroupedRequest(BaseModel):
    dataset_id: UUID
    value_column: str
    group_column: str
    agg: str = Field("mean", pattern="^(count|sum|mean|median|min|max)$")


class PreviewChart(BaseModel):
    chart_type: str
    title: str
    data: dict


class DatasetPreview(BaseModel):
    dataset_id: UUID
    dataset_name: str
    row_count: int
    column_count: int
    charts: list[PreviewChart]
