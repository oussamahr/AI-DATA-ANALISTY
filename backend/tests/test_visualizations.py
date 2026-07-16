import uuid
from pathlib import Path

import pandas as pd
import pytest
from app.models.dataset import Dataset
from app.models.tenant import Tenant
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def sample_csv(tmp_path: Path) -> Path:
    df = pd.DataFrame(
        {
            "category": ["A", "B", "A", "C", "B", "A", "D"],
            "value": [10, 20, 15, 30, 25, 12, 40],
            "score": [85.5, 92.0, 78.5, 88.0, 95.5, 70.0, 99.0],
            "date": pd.to_datetime(
                [
                    "2024-01-01",
                    "2024-01-02",
                    "2024-01-03",
                    "2024-01-04",
                    "2024-01-05",
                    "2024-01-06",
                    "2024-01-07",
                ]
            ),
            "flag": [True, False, True, False, True, True, False],
        }
    )
    path = tmp_path / "viz_test.csv"
    df.to_csv(path, index=False)
    return path


@pytest.fixture
async def ds(db: AsyncSession, test_user: User, test_tenant: Tenant, sample_csv: Path) -> Dataset:
    ds = Dataset(
        id=uuid.uuid4(),
        name="Viz Test",
        file_path=str(sample_csv),
        file_size_bytes=sample_csv.stat().st_size,
        mime_type="text/csv",
        owner_id=test_user.id,
        tenant_id=test_tenant.id,
    )
    db.add(ds)
    await db.flush()
    return ds


class TestBarChart:
    async def test_bar_chart_categorical(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset
    ):
        response = await client.post(
            "/api/v1/visualizations/bar",
            json={"dataset_id": str(ds.id), "column": "category"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "bar"
        assert len(data["labels"]) == 4
        assert data["datasets"][0]["label"] == "Count"

    async def test_bar_chart_not_found(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/bar",
            json={"dataset_id": str(ds.id), "column": "nonexistent"},
            headers=auth_headers,
        )
        assert response.status_code == 400


class TestHistogram:
    async def test_histogram_numeric(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/histogram?bins=10",
            json={"dataset_id": str(ds.id), "column": "value"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "histogram"
        assert data["column"] == "value"
        assert len(data["bins"]) == 10

    async def test_histogram_non_numeric(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset
    ):
        response = await client.post(
            "/api/v1/visualizations/histogram",
            json={"dataset_id": str(ds.id), "column": "category"},
            headers=auth_headers,
        )
        assert response.status_code == 400


class TestScatter:
    async def test_scatter_plot(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/scatter",
            json={"dataset_id": str(ds.id), "x_column": "value", "y_column": "score"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "scatter"
        assert len(data["points"]) == 7
        assert data["x_column"] == "value"
        assert data["y_column"] == "score"


class TestLineChart:
    async def test_line_chart(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/line",
            json={"dataset_id": str(ds.id), "x_column": "date", "y_column": "value"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "line"
        assert len(data["series"]) == 1


class TestHeatmap:
    async def test_heatmap(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/heatmap",
            json={"dataset_id": str(ds.id), "columns": ["value", "score"]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "heatmap"
        assert len(data["cells"]) == 4


class TestPieChart:
    async def test_pie_chart(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/pie",
            json={"dataset_id": str(ds.id), "column": "category"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "pie"
        assert sum(s["value"] for s in data["slices"]) == 7


class TestBoxPlot:
    async def test_box_plot(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/box",
            json={"dataset_id": str(ds.id), "columns": ["value", "score"]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "box"
        assert len(data["statistics"]) == 2


class TestGroupedBar:
    async def test_grouped_bar(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/grouped-bar",
            json={
                "dataset_id": str(ds.id),
                "value_column": "score",
                "group_column": "category",
                "agg": "mean",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chart_type"] == "bar"

    async def test_grouped_bar_count(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            "/api/v1/visualizations/grouped-bar",
            json={
                "dataset_id": str(ds.id),
                "value_column": "category",
                "group_column": "category",
                "agg": "count",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestPreview:
    async def test_preview(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.get(
            f"/api/v1/visualizations/preview/{ds.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["dataset_name"] == "Viz Test"
        assert data["row_count"] == 7
        assert len(data["charts"]) > 0
        chart_types = {c["chart_type"] for c in data["charts"]}
        assert "bar" in chart_types or "histogram" in chart_types
