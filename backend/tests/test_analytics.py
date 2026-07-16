import uuid
from pathlib import Path

import pandas as pd
import pytest
from app.core.security.auth import hash_password
from app.models.dataset import Dataset
from app.models.tenant import Tenant
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def sample_csv(tmp_path: Path) -> Path:
    df = pd.DataFrame(
        {
            "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
            "age": [25, 32, 37, 28, 45],
            "salary": [50000, 60000, 75000, 55000, 90000],
            "department": ["Engineering", "Sales", "Engineering", "Marketing", "Sales"],
            "start_date": pd.to_datetime(
                ["2020-01-15", "2019-03-01", "2021-06-15", "2022-01-01", "2018-11-30"]
            ),
            "is_manager": [True, False, True, False, True],
            "notes": ["Good", "Excellent", "Average", "Good", "Excellent"],
        }
    )
    path = tmp_path / "test_data.csv"
    df.to_csv(path, index=False)
    return path


@pytest.fixture
async def uploaded_dataset(
    db: AsyncSession, test_user: User, sample_csv: Path, test_tenant: Tenant
) -> Dataset:
    ds = Dataset(
        id=uuid.uuid4(),
        name="Test Dataset",
        description="For analytics testing",
        file_path=str(sample_csv),
        file_size_bytes=sample_csv.stat().st_size,
        mime_type="text/csv",
        owner_id=test_user.id,
        tenant_id=test_tenant.id,
    )
    db.add(ds)
    await db.flush()
    return ds


class TestDataProfiling:
    async def test_run_profile(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        response = await client.post(
            f"/api/v1/analytics/profile/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["dataset_id"] == str(uploaded_dataset.id)
        assert data["column_count"] == 7
        assert data["row_count"] == 5
        columns = {c["column_name"]: c for c in data["columns"]}
        assert "age" in columns
        assert columns["age"]["dtype"] == "numeric"
        assert columns["age"]["min_val"] == "25.0"
        assert columns["age"]["max_val"] == "45.0"
        assert columns["age"]["mean"] == 33.4

    async def test_get_profile(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset, db: AsyncSession
    ):
        await client.post(
            f"/api/v1/analytics/profile/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        response = await client.get(
            f"/api/v1/analytics/profile/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["column_count"] == 7

    async def test_get_profile_not_found(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        response = await client.get(
            f"/api/v1/analytics/profile/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_profile_null_handling(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
        uploaded_dataset: Dataset,
        db: AsyncSession,
        tmp_path: Path,
    ):
        df = pd.DataFrame(
            {
                "col1": [1.0, 2.0, None, 4.0, 5.0],
                "col2": ["a", None, "c", None, "e"],
            }
        )
        path = tmp_path / "null_test.csv"
        df.to_csv(path, index=False)
        ds = Dataset(
            id=uuid.uuid4(),
            name="Null Test",
            file_path=str(path),
            file_size_bytes=path.stat().st_size,
            mime_type="text/csv",
            owner_id=uploaded_dataset.owner_id,
            tenant_id=uploaded_dataset.tenant_id,
        )
        db.add(ds)
        await db.flush()

        response = await client.post(
            f"/api/v1/analytics/profile/{ds.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        cols = {c["column_name"]: c for c in data["columns"]}
        assert cols["col1"]["null_count"] == 1
        assert cols["col1"]["null_percent"] == 20.0
        assert cols["col2"]["null_count"] == 2
        assert cols["col2"]["null_percent"] == 40.0


class TestCorrelation:
    async def test_correlation_analysis(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        response = await client.post(
            f"/api/v1/analytics/correlate/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "age" in data["numeric_columns"]
        assert "salary" in data["numeric_columns"]
        assert len(data["correlations"]) > 0
        matrix = data["matrix"]
        assert len(matrix) == 2
        assert len(matrix[0]) == 2


class TestComprehensiveAnalysis:
    async def test_full_analysis(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        response = await client.post(
            f"/api/v1/analytics/analyze/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["dataset_name"] == "Test Dataset"
        assert data["row_count"] == 5
        assert data["column_count"] == 7
        assert len(data["profile"]) == 7
        assert len(data["correlations"]) > 0

    async def test_get_report(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        await client.post(
            f"/api/v1/analytics/analyze/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        response = await client.get(
            f"/api/v1/analytics/report/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["dataset_name"] == "Test Dataset"

    async def test_get_report_not_found(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        response = await client.get(
            f"/api/v1/analytics/report/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestAnalysisRuns:
    async def test_list_runs(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        await client.post(
            f"/api/v1/analytics/analyze/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        response = await client.get(
            "/api/v1/analytics/runs",
            headers=auth_headers,
        )
        assert response.status_code == 200
        runs = response.json()
        assert len(runs) >= 1
        assert runs[0]["analysis_type"] == "comprehensive"
        assert runs[0]["status"] == "completed"

    async def test_list_runs_filtered(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        response = await client.get(
            f"/api/v1/analytics/runs?dataset_id={uploaded_dataset.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200

    async def test_get_run(
        self, client: AsyncClient, auth_headers: dict[str, str], uploaded_dataset: Dataset
    ):
        await client.post(
            f"/api/v1/analytics/analyze/{uploaded_dataset.id}",
            headers=auth_headers,
        )
        runs_resp = await client.get("/api/v1/analytics/runs", headers=auth_headers)
        run_id = runs_resp.json()[0]["id"]

        response = await client.get(f"/api/v1/analytics/runs/{run_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == run_id


class TestPermissions:
    async def test_analytics_requires_auth(self, client: AsyncClient, uploaded_dataset: Dataset):
        response = await client.post(f"/api/v1/analytics/profile/{uploaded_dataset.id}")
        assert response.status_code == 401

    async def test_analytics_other_tenant(
        self,
        client: AsyncClient,
        db: AsyncSession,
        uploaded_dataset: Dataset,
    ):
        other_user = User(
            email="other@example.com",
            hashed_password=hash_password("TestPass123!"),
            tenant_id=uuid.uuid4(),
        )
        db.add(other_user)
        await db.flush()

        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "other@example.com",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/v1/analytics/profile/{uploaded_dataset.id}",
            headers=headers,
        )
        assert response.status_code == 403


class TestProfileWithDifferentDtypes:
    async def test_various_dtypes(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
        test_user: User,
        test_tenant: Tenant,
        db: AsyncSession,
        tmp_path: Path,
    ):
        df = pd.DataFrame(
            {
                "ints": [1, 2, 3, 4, 5],
                "floats": [1.1, 2.2, 3.3, 4.4, 5.5],
                "cats": ["low", "medium", "high", "low", "medium"],
                "bools": [True, False, True, False, True],
                "dates": pd.to_datetime(
                    ["2023-01-01", "2023-02-01", "2023-03-01", "2023-04-01", "2023-05-01"]
                ),
                "texts": ["hello world", "foo bar", "abc def", "hello world", "test"],
            }
        )
        path = tmp_path / "dtype_test.csv"
        df.to_csv(path, index=False)

        ds = Dataset(
            id=uuid.uuid4(),
            name="Dtype Test",
            file_path=str(path),
            file_size_bytes=path.stat().st_size,
            mime_type="text/csv",
            owner_id=test_user.id,
            tenant_id=test_tenant.id,
        )
        db.add(ds)
        await db.flush()

        response = await client.post(
            f"/api/v1/analytics/profile/{ds.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        cols = {c["column_name"]: c for c in data["columns"]}
        assert cols["ints"]["dtype"] == "numeric"
        assert cols["floats"]["dtype"] == "numeric"
        assert cols["cats"]["dtype"] == "categorical"
        assert cols["texts"]["dtype"] == "text"
        assert cols["dates"]["dtype"] == "datetime"
