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
            "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
            "age": [25, None, 37, 28, 45],
            "salary": [50000, 60000, 75000, None, 90000],
            "department": ["Engineering", "Sales", "Engineering", "Marketing", None],
            "score": [85.5, 92.0, 78.5, 88.0, 95.5],
        }
    )
    path = tmp_path / "transform_test.csv"
    df.to_csv(path, index=False)
    return path


@pytest.fixture
async def ds(db: AsyncSession, test_user: User, test_tenant: Tenant, sample_csv: Path) -> Dataset:
    ds = Dataset(
        id=uuid.uuid4(),
        name="Transform Test",
        description="For transform testing",
        file_path=str(sample_csv),
        file_size_bytes=sample_csv.stat().st_size,
        mime_type="text/csv",
        owner_id=test_user.id,
        tenant_id=test_tenant.id,
    )
    db.add(ds)
    await db.flush()
    return ds


class TestImputeTransform:
    async def test_impute_mean(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/impute?dataset_id={ds.id}",
            json={"column": "age", "strategy": "mean"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["transform_type"] == "impute"
        assert data["config"]["strategy"] == "mean"
        assert data["applied_order"] == 1

    async def test_impute_constant(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/impute?dataset_id={ds.id}",
            json={"column": "department", "strategy": "constant", "fill_value": "Unknown"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["config"]["strategy"] == "constant"

    async def test_impute_drop(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/impute?dataset_id={ds.id}",
            json={"column": "age", "strategy": "drop"},
            headers=auth_headers,
        )
        assert response.status_code == 201

    async def test_impute_non_numeric_mean(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset
    ):
        response = await client.post(
            f"/api/v1/transforms/impute?dataset_id={ds.id}",
            json={"column": "name", "strategy": "mean"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["transform_type"] == "impute"


class TestOutlierRemoval:
    async def test_remove_outliers_iqr(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/remove-outliers?dataset_id={ds.id}",
            json={"column": "salary", "method": "iqr", "threshold": 1.5},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["transform_type"] == "remove_outliers"

    async def test_remove_outliers_zscore(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset
    ):
        response = await client.post(
            f"/api/v1/transforms/remove-outliers?dataset_id={ds.id}",
            json={"column": "score", "method": "zscore", "threshold": 3.0},
            headers=auth_headers,
        )
        assert response.status_code == 201


class TestCastTransform:
    async def test_cast_to_string(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/cast?dataset_id={ds.id}",
            json={"column": "age", "target_type": "string"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["config"]["target_type"] == "string"

    async def test_cast_to_numeric(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/cast?dataset_id={ds.id}",
            json={"column": "age", "target_type": "numeric"},
            headers=auth_headers,
        )
        assert response.status_code == 201

    async def test_cast_invalid_column(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/cast?dataset_id={ds.id}",
            json={"column": "nonexistent", "target_type": "string"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["config"]["column"] == "nonexistent"


class TestFilterTransform:
    async def test_filter_eq(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/filter?dataset_id={ds.id}",
            json={
                "conditions": [{"column": "department", "operator": "eq", "value": "Engineering"}],
                "logic": "and",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    async def test_filter_gt(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/filter?dataset_id={ds.id}",
            json={
                "conditions": [{"column": "age", "operator": "gt", "value": "30"}],
                "logic": "and",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    async def test_filter_not_null(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/filter?dataset_id={ds.id}",
            json={
                "conditions": [{"column": "salary", "operator": "not_null"}],
                "logic": "and",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    async def test_filter_multi_or(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/filter?dataset_id={ds.id}",
            json={
                "conditions": [
                    {"column": "department", "operator": "eq", "value": "Sales"},
                    {"column": "department", "operator": "eq", "value": "Marketing"},
                ],
                "logic": "or",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201


class TestRenameDropTransform:
    async def test_rename_column(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/rename?dataset_id={ds.id}",
            json={"column": "name", "new_name": "full_name"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["config"]["new_name"] == "full_name"

    async def test_drop_columns(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/drop?dataset_id={ds.id}",
            json={"columns": ["notes"]},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert "notes" in response.json()["config"]["columns"]


class TestNormalizeTransform:
    async def test_normalize_minmax(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/normalize?dataset_id={ds.id}",
            json={"column": "score", "method": "minmax"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["config"]["method"] == "minmax"

    async def test_normalize_zscore(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/normalize?dataset_id={ds.id}",
            json={"column": "score", "method": "zscore"},
            headers=auth_headers,
        )
        assert response.status_code == 201


class TestEncodeTransform:
    async def test_encode_column(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        response = await client.post(
            f"/api/v1/transforms/encode?dataset_id={ds.id}",
            json={"column": "department", "drop_first": False},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["config"]["column"] == "department"


class TestTransformPipeline:
    async def test_list_transforms(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        for cfg in [
            ("impute", {"column": "age", "strategy": "mean"}),
            ("impute", {"column": "salary", "strategy": "median"}),
        ]:
            await client.post(
                f"/api/v1/transforms/{cfg[0]}?dataset_id={ds.id}",
                json=cfg[1],
                headers=auth_headers,
            )

        response = await client.get(f"/api/v1/transforms/{ds.id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

    async def test_delete_transform(self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset):
        resp = await client.post(
            f"/api/v1/transforms/impute?dataset_id={ds.id}",
            json={"column": "age", "strategy": "mean"},
            headers=auth_headers,
        )
        tid = resp.json()["id"]

        delete_resp = await client.delete(f"/api/v1/transforms/{tid}", headers=auth_headers)
        assert delete_resp.status_code == 200

        list_resp = await client.get(f"/api/v1/transforms/{ds.id}", headers=auth_headers)
        assert len(list_resp.json()) == 0

    async def test_apply_transforms_creates_cleaned_dataset(
        self, client: AsyncClient, auth_headers: dict[str, str], ds: Dataset, db: AsyncSession, tmp_path: Path
    ):
        df = pd.DataFrame(
            {
                "col1": [1.0, 2.0, None, 4.0, 5.0],
                "col2": ["a", "b", "c", "d", "e"],
            }
        )
        path = tmp_path / "apply_test.csv"
        df.to_csv(path, index=False)

        ds2 = Dataset(
            id=uuid.uuid4(),
            name="Apply Test",
            file_path=str(path),
            file_size_bytes=path.stat().st_size,
            mime_type="text/csv",
            owner_id=ds.owner_id,
            tenant_id=ds.tenant_id,
        )
        db.add(ds2)
        await db.flush()

        await client.post(
            f"/api/v1/transforms/impute?dataset_id={ds2.id}",
            json={"column": "col1", "strategy": "mean"},
            headers=auth_headers,
        )

        resp = await client.post(
            "/api/v1/transforms/apply",
            json={"dataset_id": str(ds2.id), "output_name": "Cleaned Data"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Cleaned Data"
        assert data["parent_id"] == str(ds2.id)
        assert data["row_count"] == 5
