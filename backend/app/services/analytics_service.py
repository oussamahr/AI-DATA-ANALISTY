import json
import math
import uuid
import warnings
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.analysis import AnalysisResult, AnalysisRun, DataProfile
from app.models.dataset import Dataset
from app.models.user import User

DATA_EXTENSION_READERS = {
    ".csv": lambda p: pd.read_csv(p, low_memory=False, parse_dates=True),
    ".tsv": lambda p: pd.read_csv(p, sep="\t", low_memory=False, parse_dates=True),
    ".xlsx": lambda p: pd.read_excel(p, engine="openpyxl"),
    ".xls": lambda p: pd.read_excel(p, engine="xlrd"),
    ".json": lambda p: pd.read_json(p),
    ".parquet": lambda p: pd.read_parquet(p),
    ".feather": lambda p: pd.read_feather(p),
}


def _load_dataframe(file_path: str) -> pd.DataFrame:
    ext = Path(file_path).suffix.lower()
    reader = DATA_EXTENSION_READERS.get(ext)
    if reader is None:
        raise AppException(f"Unsupported file format: {ext}", 400)
    try:
        df = reader(file_path)
    except Exception as e:
        raise AppException(f"Failed to read dataset: {str(e)}", 422) from e
    for col in df.select_dtypes(include=["object", "str", "string"]).columns:
        try:
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", message="Could not infer format")
                converted = pd.to_datetime(df[col], errors="coerce", format=None)
            if converted.notna().sum() > len(df) * 0.5:
                df[col] = converted
        except (ValueError, TypeError):
            pass
    return df


def _infer_column_dtype(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    n_unique = series.nunique()
    n_total = max(len(series), 1)
    if n_unique < 20:
        if n_total >= 100 or n_unique / n_total < 0.7:
            return "categorical"
        return "text"
    if n_unique / n_total < 0.05:
        return "categorical"
    return "text"


def _compute_histogram(series: pd.Series, bins: int = 20) -> list[dict]:
    series = series.dropna()
    if len(series) == 0:
        return []
    try:
        counts, edges = np.histogram(series, bins=bins)
        return [
            {"bin_start": float(edges[i]), "bin_end": float(edges[i + 1]), "count": int(counts[i])}
            for i in range(len(counts))
        ]
    except Exception:
        return []


def _compute_top_values(series: pd.Series, limit: int = 10) -> list[dict]:
    vc = series.value_counts().head(limit)
    total = max(len(series), 1)
    return [
        {"value": str(val), "count": int(cnt), "percent": round(cnt / total * 100, 2)}
        for val, cnt in vc.items()
    ]


def _coerce_numeric(val: Any) -> float | None:
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


class AnalyticsService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def _get_dataset(self, dataset_id: str, user: User) -> Dataset:
        result = await self.db.execute(
            select(Dataset).where(
                Dataset.id == uuid.UUID(dataset_id),
                Dataset.is_deleted == False,
            )
        )
        ds = result.scalar_one_or_none()
        if ds is None:
            raise AppException("Dataset not found", 404)
        if user.tenant_id and ds.tenant_id != user.tenant_id:
            raise AppException("Access denied", 403)
        return ds

    async def run_profile(
        self, dataset_id: str, user: User, force: bool = False
    ) -> list[DataProfile]:
        ds = await self._get_dataset(dataset_id, user)

        await self.db.execute(delete(DataProfile).where(DataProfile.dataset_id == ds.id))

        df = _load_dataframe(ds.file_path)
        profiles = []

        for col_name in df.columns:
            series = df[col_name]
            total = len(series)
            null_count = int(series.isna().sum())
            dtype = _infer_column_dtype(series)
            cleaned = series.dropna()

            profile = DataProfile(
                id=uuid.uuid4(),
                dataset_id=ds.id,
                column_name=str(col_name),
                dtype=dtype,
                null_count=null_count,
                total_count=total,
                unique_count=int(cleaned.nunique()),
                top_values=_compute_top_values(cleaned),
            )

            if dtype == "numeric" and len(cleaned) > 0:
                nums = cleaned.astype(float)
                profile.min_val = str(nums.min()) if not nums.empty else None
                profile.max_val = str(nums.max()) if not nums.empty else None
                profile.mean = _coerce_numeric(nums.mean())
                profile.median = _coerce_numeric(nums.median())
                profile.std = _coerce_numeric(nums.std())
                profile.histogram = _compute_histogram(nums)
            elif dtype == "datetime" and len(cleaned) > 0:
                profile.min_val = str(cleaned.min())
                profile.max_val = str(cleaned.max())
            else:
                vals = cleaned.astype(str)
                profile.min_val = vals.min() if not vals.empty else None
                profile.max_val = vals.max() if not vals.empty else None

            self.db.add(profile)
            profiles.append(profile)

        ds.row_count = len(df)
        ds.column_definitions = json.dumps(
            {
                col: str(dtype)
                for col, dtype in zip(df.columns, [p.dtype for p in profiles], strict=False)
            }
        )

        await self.db.flush()
        return profiles

    async def get_profiles(self, dataset_id: str, user: User) -> list[DataProfile]:
        await self._get_dataset(dataset_id, user)
        result = await self.db.execute(
            select(DataProfile)
            .where(DataProfile.dataset_id == uuid.UUID(dataset_id))
            .order_by(DataProfile.column_name)
        )
        return list(result.scalars().all())

    async def run_correlation_analysis(self, dataset_id: str, user: User) -> AnalysisResult:
        ds = await self._get_dataset(dataset_id, user)
        profiles = await self.get_profiles(dataset_id, user)
        numeric_cols = [p.column_name for p in profiles if p.dtype == "numeric"]

        df = _load_dataframe(ds.file_path)

        if not numeric_cols:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            user_id=user.id,
            analysis_type="correlation",
            status="running",
        )
        self.db.add(run)
        await self.db.flush()

        try:
            valid_cols = [c for c in numeric_cols if c in df.columns]
            if len(valid_cols) < 2:
                raise AppException("Need at least 2 numeric columns for correlation", 400)

            numeric_df = df[valid_cols].select_dtypes(include=[np.number]).dropna()
            if len(numeric_df) < 2:
                raise AppException("Insufficient numeric data after cleaning", 400)

            corr_matrix = numeric_df.corr().to_dict()

            correlations = []
            for i, c1 in enumerate(valid_cols):
                for c2 in valid_cols[i + 1 :]:
                    val = corr_matrix.get(c1, {}).get(c2)
                    if val is not None and not (isinstance(val, float) and math.isnan(val)):
                        correlations.append(
                            {
                                "column_1": c1,
                                "column_2": c2,
                                "correlation": round(float(val), 4),
                            }
                        )

            data = {
                "numeric_columns": valid_cols,
                "correlations": correlations,
                "matrix": {
                    "columns": valid_cols,
                    "values": [
                        [corr_matrix.get(c1, {}).get(c2) for c2 in valid_cols] for c1 in valid_cols
                    ],
                },
            }

            result = AnalysisResult(
                id=uuid.uuid4(),
                analysis_run_id=run.id,
                dataset_id=ds.id,
                result_type="correlation_matrix",
                data=data,
            )
            self.db.add(result)

            run.status = "completed"
            run.completed_at = datetime.now(UTC)
            await self.db.flush()
            return result

        except AppException:
            run.status = "failed"
            run.completed_at = datetime.now(UTC)
            run.error_message = "Correlation analysis failed"
            await self.db.flush()
            raise

    async def run_full_analysis(self, dataset_id: str, user: User) -> AnalysisResult:
        ds = await self._get_dataset(dataset_id, user)

        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            user_id=user.id,
            analysis_type="comprehensive",
            status="running",
        )
        self.db.add(run)
        await self.db.flush()

        try:
            profiles = await self.run_profile(dataset_id, user, force=True)
            df = _load_dataframe(ds.file_path)
            numeric_cols = [p.column_name for p in profiles if p.dtype == "numeric"]

            sections = []

            profile_data = [
                {
                    "column_name": p.column_name,
                    "dtype": p.dtype,
                    "null_count": p.null_count,
                    "total_count": p.total_count,
                    "null_percent": round(p.null_count / max(p.total_count, 1) * 100, 2),
                    "unique_count": p.unique_count,
                    "unique_percent": round(p.unique_count / max(p.total_count, 1) * 100, 2),
                    "mean": p.mean,
                    "median": p.median,
                    "std": p.std,
                    "min": p.min_val,
                    "max": p.max_val,
                    "top_values": p.top_values,
                    "histogram": p.histogram,
                }
                for p in profiles
            ]
            sections.append(
                {"title": "Column Profiles", "content": profile_data, "type": "profiles"}
            )

            if len(numeric_cols) >= 2:
                numeric_df = df[numeric_cols].select_dtypes(include=[np.number]).dropna()
                if len(numeric_df) >= 2:
                    corr_matrix = numeric_df.corr()
                    corr_data = []
                    for i, c1 in enumerate(numeric_cols):
                        for c2 in numeric_cols[i + 1 :]:
                            val = corr_matrix.loc[c1, c2]
                            if not (isinstance(val, float) and math.isnan(val)):
                                corr_data.append(
                                    {
                                        "column_1": c1,
                                        "column_2": c2,
                                        "correlation": round(float(val), 4),
                                    }
                                )
                    sections.append(
                        {"title": "Correlations", "content": corr_data, "type": "correlations"}
                    )

            data = {
                "dataset_id": str(ds.id),
                "dataset_name": ds.name,
                "row_count": len(df),
                "column_count": len(df.columns),
                "sections": sections,
            }

            result = AnalysisResult(
                id=uuid.uuid4(),
                analysis_run_id=run.id,
                dataset_id=ds.id,
                result_type="report",
                data=data,
            )
            self.db.add(result)

            run.status = "completed"
            run.completed_at = datetime.now(UTC)
            await self.db.flush()
            return result

        except AppException:
            run.status = "failed"
            run.completed_at = datetime.now(UTC)
            run.error_message = "Analysis failed"
            await self.db.flush()
            raise

    async def get_report(self, dataset_id: str, user: User) -> AnalysisResult | None:
        await self._get_dataset(dataset_id, user)
        result = await self.db.execute(
            select(AnalysisResult)
            .where(
                AnalysisResult.dataset_id == uuid.UUID(dataset_id),
                AnalysisResult.result_type == "report",
            )
            .order_by(AnalysisResult.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_runs(self, dataset_id: str | None, user: User) -> list[AnalysisRun]:
        query = (
            select(AnalysisRun)
            .join(Dataset, AnalysisRun.dataset_id == Dataset.id)
            .where(Dataset.tenant_id == user.tenant_id)
            .order_by(AnalysisRun.created_at.desc())
        )
        if dataset_id:
            query = query.where(AnalysisRun.dataset_id == uuid.UUID(dataset_id))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_run(self, run_id: str, user: User) -> AnalysisRun | None:
        run = await self.db.get(AnalysisRun, uuid.UUID(run_id))
        if run is None:
            raise AppException("Analysis run not found", 404)
        ds = await self.db.get(Dataset, run.dataset_id)
        if ds and user.tenant_id and ds.tenant_id != user.tenant_id:
            raise AppException("Access denied", 403)
        return run
