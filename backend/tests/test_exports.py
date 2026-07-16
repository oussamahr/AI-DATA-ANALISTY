import uuid
from pathlib import Path

import pandas as pd
import pytest
from app.models.analysis import AnalysisResult, AnalysisRun, DataProfile
from app.models.dataset import Dataset
from app.models.tenant import Tenant
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def sample_csv(tmp_path: Path) -> Path:
    df = pd.DataFrame(
        {
            "name": ["Alice", "Bob", "Charlie"],
            "age": [25, 32, 37],
            "salary": [50000, 60000, 75000],
            "dept": ["Eng", "Sales", "Eng"],
        }
    )
    path = tmp_path / "export_test.csv"
    df.to_csv(path, index=False)
    return path


@pytest.fixture
async def ds(db: AsyncSession, test_user: User, test_tenant: Tenant, sample_csv: Path) -> Dataset:
    ds = Dataset(
        id=uuid.uuid4(),
        name="Export Test",
        file_path=str(sample_csv),
        file_size_bytes=sample_csv.stat().st_size,
        mime_type="text/csv",
        row_count=3,
        owner_id=test_user.id,
        tenant_id=test_tenant.id,
    )
    db.add(ds)
    await db.flush()
    return ds


@pytest.fixture
async def ds_with_profile(db: AsyncSession, test_user: User, ds: Dataset) -> Dataset:
    profiles = [
        DataProfile(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            column_name="name",
            dtype="text",
            total_count=3,
            null_count=0,
            unique_count=3,
            top_values=[{"value": "Alice", "count": 1}],
        ),
        DataProfile(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            column_name="age",
            dtype="numeric",
            total_count=3,
            null_count=0,
            unique_count=3,
            mean=31.33,
            median=32.0,
            std=6.03,
            min_val="25",
            max_val="37",
        ),
        DataProfile(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            column_name="salary",
            dtype="numeric",
            total_count=3,
            null_count=0,
            unique_count=3,
            mean=61666.67,
            median=60000.0,
            std=12583.06,
            min_val="50000",
            max_val="75000",
        ),
        DataProfile(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            column_name="dept",
            dtype="categorical",
            total_count=3,
            null_count=0,
            unique_count=2,
            top_values=[{"value": "Eng", "count": 2}],
        ),
    ]
    for p in profiles:
        db.add(p)

    run = AnalysisRun(
        id=uuid.uuid4(),
        dataset_id=ds.id,
        user_id=test_user.id,
        analysis_type="comprehensive",
        status="completed",
    )
    db.add(run)

    result = AnalysisResult(
        id=uuid.uuid4(),
        analysis_run_id=run.id,
        dataset_id=ds.id,
        result_type="report",
        data={
            "dataset_id": str(ds.id),
            "dataset_name": ds.name,
            "row_count": 3,
            "column_count": 4,
            "sections": [
                {
                    "title": "Column Profiles",
                    "content": [{"col": "name", "dtype": "text"}],
                    "type": "profiles",
                },
                {
                    "title": "Correlations",
                    "content": [{"col1": "age", "col2": "salary", "corr": 0.98}],
                    "type": "correlations",
                },
            ],
        },
    )
    db.add(result)

    corr_run = AnalysisRun(
        id=uuid.uuid4(),
        dataset_id=ds.id,
        user_id=test_user.id,
        analysis_type="correlation",
        status="completed",
    )
    db.add(corr_run)
    corr_result = AnalysisResult(
        id=uuid.uuid4(),
        analysis_run_id=corr_run.id,
        dataset_id=ds.id,
        result_type="correlation_matrix",
        data={
            "numeric_columns": ["age", "salary"],
            "correlations": [{"column_1": "age", "column_2": "salary", "correlation": 0.98}],
            "matrix": {"columns": ["age", "salary"], "values": [[1.0, 0.98], [0.98, 1.0]]},
        },
    )
    db.add(corr_result)

    insight_run = AnalysisRun(
        id=uuid.uuid4(),
        dataset_id=ds.id,
        user_id=test_user.id,
        analysis_type="ai_insight",
        status="completed",
    )
    db.add(insight_run)
    insight_result = AnalysisResult(
        id=uuid.uuid4(),
        analysis_run_id=insight_run.id,
        dataset_id=ds.id,
        result_type="ai_insight",
        data={
            "dataset_id": str(ds.id),
            "dataset_name": ds.name,
            "summary": "Small employee dataset",
            "insights": [
                {"type": "pattern", "severity": "low", "title": "Test", "description": "desc"}
            ],
        },
    )
    db.add(insight_result)

    await db.flush()
    return ds


class TestExportProfile:
    async def test_export_profile_csv(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/profile/{ds_with_profile.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "attachment" in response.headers["content-disposition"]

    async def test_export_profile_xlsx(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/profile/{ds_with_profile.id}?format=xlsx",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers["content-type"]

    async def test_export_profile_no_data(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/profile/{ds.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_export_profile_unauthorized(self, client: AsyncClient, ds_with_profile: Dataset):
        response = await client.get(
            f"/api/v1/exports/profile/{ds_with_profile.id}?format=csv",
        )
        assert response.status_code == 401


class TestExportCorrelations:
    async def test_export_corr_csv(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/correlations/{ds_with_profile.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]

    async def test_export_corr_xlsx(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/correlations/{ds_with_profile.id}?format=xlsx",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers["content-type"]

    async def test_export_corr_no_data(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.get(
            f"/api/v1/exports/correlations/{ds.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestExportReport:
    async def test_export_report_csv(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/report/{ds_with_profile.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]

    async def test_export_report_xlsx(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/report/{ds_with_profile.id}?format=xlsx",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers["content-type"]

    async def test_export_report_no_data(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/report/{ds.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestExportInsights:
    async def test_export_insights_csv(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/insights/{ds_with_profile.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]

    async def test_export_insights_xlsx(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_profile: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/insights/{ds_with_profile.id}?format=xlsx",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers["content-type"]

    async def test_export_insights_no_data(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset
    ):
        response = await client.get(
            f"/api/v1/exports/insights/{ds.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestExportDataset:
    async def test_export_dataset_csv(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.get(
            f"/api/v1/exports/dataset/{ds.id}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        body = response.text
        assert "name" in body
        assert "Alice" in body

    async def test_export_dataset_xlsx(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.get(
            f"/api/v1/exports/dataset/{ds.id}?format=xlsx",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers["content-type"]

    async def test_export_dataset_not_found(self, client: AsyncClient, auth_headers: dict[str, str]):
        response = await client.get(
            f"/api/v1/exports/dataset/{uuid.uuid4()}?format=csv",
            headers=auth_headers,
        )
        assert response.status_code == 404
