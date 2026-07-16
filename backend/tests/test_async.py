import uuid
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest
from app.models.dataset import Dataset
from app.models.tenant import Tenant
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


class TestAsyncEndpoints:
    async def test_profile_async_returns_task(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_data: Dataset
    ):
        with patch("app.tasks.analytics_tasks.profile_dataset_task.delay") as mock_task:
            response = await client.post(
                f"/api/v1/analytics/profile/{ds_with_data.id}?async=true",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert "run_id" in data
            assert data["status"] == "pending"
            mock_task.assert_called_once()

    async def test_correlate_async_returns_task(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_data: Dataset
    ):
        with patch("app.tasks.analytics_tasks.correlate_dataset_task.delay") as mock_task:
            response = await client.post(
                f"/api/v1/analytics/correlate/{ds_with_data.id}?async=true",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert "run_id" in data
            mock_task.assert_called_once()

    async def test_analyze_async_returns_task(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_data: Dataset
    ):
        with patch("app.tasks.analytics_tasks.comprehensive_analysis_task.delay") as mock_task:
            response = await client.post(
                f"/api/v1/analytics/analyze/{ds_with_data.id}?async=true",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert "run_id" in data
            mock_task.assert_called_once()

    async def test_insights_async_returns_task(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_data: Dataset
    ):
        with patch("app.tasks.analytics_tasks.ai_insights_task.delay") as mock_task:
            response = await client.post(
                f"/api/v1/analytics/insights/{ds_with_data.id}?async=true",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert "run_id" in data
            mock_task.assert_called_once()

    async def test_apply_transforms_async(
        self, client: AsyncClient, auth_headers: dict[str, str], ds_with_data: Dataset
    ):
        with patch("app.tasks.transform_tasks.apply_transforms_task.delay") as mock_task:
            response = await client.post(
                "/api/v1/transforms/apply?async=true",
                json={"dataset_id": str(ds_with_data.id), "output_name": "Async Cleaned"},
                headers=auth_headers,
            )
            assert response.status_code == 201
            data = response.json()
            assert "run_id" in data or "status" in data
            mock_task.assert_called_once()


@pytest.fixture
async def ds_with_data(db: AsyncSession, test_user: User, test_tenant: Tenant, tmp_path: Path) -> Dataset:
    df = pd.DataFrame(
        {
            "name": ["Alice", "Bob", "Charlie"],
            "age": [25, 32, 37],
            "score": [85.5, 92.0, 78.5],
        }
    )
    path = tmp_path / "async_test.csv"
    df.to_csv(path, index=False)

    ds = Dataset(
        id=uuid.uuid4(),
        name="Async Test",
        file_path=str(path),
        file_size_bytes=path.stat().st_size,
        mime_type="text/csv",
        owner_id=test_user.id,
        tenant_id=test_tenant.id,
    )
    db.add(ds)
    await db.flush()
    return ds
