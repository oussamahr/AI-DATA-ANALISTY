import uuid
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.dataset import Dataset
from app.models.transform import DataTransform
from app.models.user import User
from app.services.analytics_service import _load_dataframe


class TransformService:
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

    async def _next_order(self, dataset_id: str) -> int:
        result = await self.db.execute(
            select(func.max(DataTransform.applied_order)).where(
                DataTransform.dataset_id == uuid.UUID(dataset_id)
            )
        )
        max_order = result.scalar() or 0
        return max_order + 1

    def _apply_imputation(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        col = config["column"]
        strategy = config["strategy"]
        fill_value = config.get("fill_value")

        if col not in df.columns:
            raise AppException(f"Column '{col}' not found", 400)

        if strategy == "drop":
            df = df.dropna(subset=[col])
        elif strategy == "mean":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise AppException(f"Cannot use mean strategy on non-numeric column '{col}'", 400)
            df[col] = df[col].fillna(df[col].mean())
        elif strategy == "median":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise AppException(f"Cannot use median strategy on non-numeric column '{col}'", 400)
            df[col] = df[col].fillna(df[col].median())
        elif strategy == "mode":
            mode_vals = df[col].mode()
            if not mode_vals.empty:
                df[col] = df[col].fillna(mode_vals[0])
        elif strategy == "constant" and fill_value is not None:
            df[col] = df[col].fillna(self._coerce_value(fill_value, df[col].dtype))
        return df

    def _apply_outlier_removal(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        col = config["column"]
        method = config.get("method", "iqr")
        threshold = config.get("threshold", 1.5)

        if col not in df.columns:
            raise AppException(f"Column '{col}' not found", 400)
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise AppException(f"Cannot detect outliers on non-numeric column '{col}'", 400)

        if method == "iqr":
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - threshold * iqr
            upper = q3 + threshold * iqr
            return df[(df[col] >= lower) & (df[col] <= upper)]
        elif method == "zscore":
            mean = df[col].mean()
            std = df[col].std()
            if std == 0:
                return df
            z_scores = (df[col] - mean) / std
            return df[z_scores.abs() <= threshold]
        return df

    def _apply_cast(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        col = config["column"]
        target = config["target_type"]

        if col not in df.columns:
            raise AppException(f"Column '{col}' not found", 400)

        try:
            if target == "numeric":
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif target == "int":
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
            elif target == "float":
                df[col] = pd.to_numeric(df[col], errors="coerce").astype(float)
            elif target == "string":
                df[col] = df[col].astype(str)
            elif target == "datetime":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif target == "category":
                df[col] = df[col].astype("category")
        except Exception as e:
            raise AppException(f"Failed to cast column '{col}' to {target}: {str(e)}", 400) from e
        return df

    def _apply_filter(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        conditions = config.get("conditions", [])
        logic = config.get("logic", "and")

        masks = []
        for cond in conditions:
            col = cond["column"]
            op = cond["operator"]
            val = cond.get("value")
            vals = cond.get("values")

            if col not in df.columns:
                raise AppException(f"Column '{col}' not found", 400)

            if op == "eq":
                masks.append(df[col] == self._coerce_value(val, df[col].dtype))
            elif op == "neq":
                masks.append(df[col] != self._coerce_value(val, df[col].dtype))
            elif op == "gt":
                masks.append(pd.to_numeric(df[col], errors="coerce") > float(val))
            elif op == "gte":
                masks.append(pd.to_numeric(df[col], errors="coerce") >= float(val))
            elif op == "lt":
                masks.append(pd.to_numeric(df[col], errors="coerce") < float(val))
            elif op == "lte":
                masks.append(pd.to_numeric(df[col], errors="coerce") <= float(val))
            elif op == "in":
                masks.append(df[col].isin(vals or []))
            elif op == "not_in":
                masks.append(~df[col].isin(vals or []))
            elif op == "contains":
                masks.append(df[col].astype(str).str.contains(val or "", na=False))
            elif op == "is_null":
                masks.append(df[col].isna())
            elif op == "not_null":
                masks.append(df[col].notna())

        if not masks:
            return df

        combined = masks[0]
        for m in masks[1:]:
            combined = combined & m if logic == "and" else combined | m
        return df[combined].reset_index(drop=True)

    def _apply_rename(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        col = config["column"]
        new_name = config["new_name"]
        if col not in df.columns:
            raise AppException(f"Column '{col}' not found", 400)
        return df.rename(columns={col: new_name})

    def _apply_drop(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        cols = config.get("columns", [])
        missing = [c for c in cols if c not in df.columns]
        if missing:
            raise AppException(f"Columns not found: {missing}", 400)
        return df.drop(columns=cols)

    def _apply_normalize(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        col = config["column"]
        method = config.get("method", "minmax")

        if col not in df.columns:
            raise AppException(f"Column '{col}' not found", 400)
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise AppException(f"Cannot normalize non-numeric column '{col}'", 400)

        vals = pd.to_numeric(df[col], errors="coerce")
        if method == "minmax":
            min_v, max_v = vals.min(), vals.max()
            if max_v == min_v:
                df[col] = 0.0
            else:
                df[col] = (vals - min_v) / (max_v - min_v)
        elif method == "zscore":
            mean, std = vals.mean(), vals.std()
            if std == 0:
                df[col] = 0.0
            else:
                df[col] = (vals - mean) / std
        return df

    def _apply_encode(self, df: pd.DataFrame, config: dict) -> pd.DataFrame:
        col = config["column"]
        drop_first = config.get("drop_first", False)

        if col not in df.columns:
            raise AppException(f"Column '{col}' not found", 400)

        dummies = pd.get_dummies(df[col], prefix=col, drop_first=drop_first, dtype=int)
        df = pd.concat([df, dummies], axis=1)
        df = df.drop(columns=[col])
        return df

    def _coerce_value(self, value: str, dtype: Any) -> Any:
        if pd.api.types.is_numeric_dtype(dtype):
            try:
                return float(value)
            except ValueError:
                return value
        return value

    def _apply_transform_to_df(self, df: pd.DataFrame, transform: DataTransform) -> pd.DataFrame:
        ttype = transform.transform_type
        cfg = transform.config

        if ttype == "impute":
            return self._apply_imputation(df, cfg)
        elif ttype == "remove_outliers":
            return self._apply_outlier_removal(df, cfg)
        elif ttype == "cast":
            return self._apply_cast(df, cfg)
        elif ttype == "filter":
            return self._apply_filter(df, cfg)
        elif ttype == "rename":
            return self._apply_rename(df, cfg)
        elif ttype == "drop":
            return self._apply_drop(df, cfg)
        elif ttype == "normalize":
            return self._apply_normalize(df, cfg)
        elif ttype == "encode":
            return self._apply_encode(df, cfg)
        raise AppException(f"Unknown transform type: {ttype}", 400)

    async def add_transform(
        self, dataset_id: str, transform_type: str, config: dict, user: User, name: str = ""
    ) -> DataTransform:
        ds = await self._get_dataset(dataset_id, user)
        order = await self._next_order(dataset_id)

        t = DataTransform(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            user_id=user.id,
            name=name,
            transform_type=transform_type,
            config=config,
            applied_order=order,
        )
        self.db.add(t)
        await self.db.flush()
        return t

    async def list_transforms(self, dataset_id: str, user: User) -> list[DataTransform]:
        await self._get_dataset(dataset_id, user)
        result = await self.db.execute(
            select(DataTransform)
            .where(DataTransform.dataset_id == uuid.UUID(dataset_id))
            .order_by(DataTransform.applied_order)
        )
        return list(result.scalars().all())

    async def delete_transform(self, transform_id: str, user: User) -> None:
        t = await self.db.get(DataTransform, uuid.UUID(transform_id))
        if t is None:
            raise AppException("Transform not found", 404)
        await self._get_dataset(str(t.dataset_id), user)
        await self.db.delete(t)
        await self.db.flush()

    async def apply_transforms(self, dataset_id: str, user: User, output_name: str = "") -> Dataset:
        ds = await self._get_dataset(dataset_id, user)
        transforms = await self.list_transforms(str(ds.id), user)

        if not transforms:
            raise AppException("No transforms to apply", 400)

        df = _load_dataframe(ds.file_path)
        for t in transforms:
            df = self._apply_transform_to_df(df, t)

        upload_dir = Path("uploads") / str(ds.tenant_id) / "cleaned"
        upload_dir.mkdir(parents=True, exist_ok=True)

        new_id = uuid.uuid4()
        orig_ext = Path(ds.file_path).suffix or ".csv"
        stored_path = upload_dir / f"{new_id}{orig_ext}"

        if orig_ext in (".xlsx", ".xls"):
            df.to_excel(str(stored_path), index=False)
        elif orig_ext == ".json":
            df.to_json(str(stored_path), orient="records", date_format="iso")
        elif orig_ext == ".parquet":
            df.to_parquet(str(stored_path), index=False)
        elif orig_ext == ".feather":
            df.to_feather(str(stored_path))
        else:
            df.to_csv(str(stored_path), index=False)

        new_ds = Dataset(
            id=new_id,
            name=output_name or f"{ds.name} (cleaned)",
            description=f"Cleaned version of {ds.name}",
            file_path=str(stored_path),
            file_size_bytes=stored_path.stat().st_size,
            mime_type=ds.mime_type,
            row_count=len(df),
            column_definitions=str(
                {col: str(dtype) for col, dtype in zip(df.columns, df.dtypes, strict=False)}
            ),
            parent_id=ds.id,
            owner_id=user.id,
            tenant_id=ds.tenant_id,
        )
        self.db.add(new_ds)
        await self.db.flush()
        return new_ds
