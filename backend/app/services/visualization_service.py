import logging
import math
import uuid

import numpy as np
import pandas as pd
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.dataset import Dataset
from app.models.user import User
from app.services.analytics_service import _load_dataframe

logger = logging.getLogger("opencode.visualization_service")

COLORS = [
    "#4e79a7",
    "#f28e2b",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc948",
    "#b07aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ac",
]


class VisualizationService:
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

    async def bar_chart(self, dataset_id: str, column: str, user: User, limit: int = 20) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        if column not in df.columns:
            raise AppException(f"Column '{column}' not found", 400)

        vc = df[column].value_counts().head(limit)
        labels = [str(v) for v in vc.index]
        data = [int(c) for c in vc.values]

        return {
            "chart_type": "bar",
            "title": f"{column} Distribution",
            "labels": labels,
            "datasets": [
                {
                    "label": "Count",
                    "data": data,
                    "background_color": COLORS * (len(labels) // len(COLORS) + 1),
                }
            ],
        }

    async def histogram(self, dataset_id: str, column: str, user: User, bins: int = 20) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        if column not in df.columns:
            raise AppException(f"Column '{column}' not found", 400)
        if not pd.api.types.is_numeric_dtype(df[column]):
            raise AppException(f"Column '{column}' is not numeric", 400)

        vals = df[column].dropna()
        if len(vals) == 0:
            raise AppException(f"No non-null values in '{column}'", 400)

        counts, edges = np.histogram(vals, bins=bins)
        bin_data = [
            {
                "bin_start": round(float(edges[i]), 4),
                "bin_end": round(float(edges[i + 1]), 4),
                "count": int(counts[i]),
            }
            for i in range(len(counts))
        ]

        return {
            "chart_type": "histogram",
            "title": f"{column} Distribution",
            "column": column,
            "bins": bin_data,
        }

    async def scatter_plot(
        self, dataset_id: str, x_column: str, y_column: str, user: User, limit: int = 1000
    ) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        for col in (x_column, y_column):
            if col not in df.columns:
                raise AppException(f"Column '{col}' not found", 400)
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise AppException(f"Column '{col}' is not numeric", 400)

        plot_df = df[[x_column, y_column]].dropna().head(limit)
        points = [
            {"x": float(row[x_column]), "y": float(row[y_column]), "label": str(idx)}
            for idx, row in plot_df.iterrows()
        ]

        return {
            "chart_type": "scatter",
            "title": f"{y_column} vs {x_column}",
            "x_column": x_column,
            "y_column": y_column,
            "points": points,
        }

    async def line_chart(
        self, dataset_id: str, x_column: str, y_column: str, user: User, limit: int = 1000
    ) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        for col in (x_column, y_column):
            if col not in df.columns:
                raise AppException(f"Column '{col}' not found", 400)

        plot_df = df[[x_column, y_column]].dropna().head(limit)

        try:
            plot_df[x_column] = pd.to_datetime(plot_df[x_column])
            plot_df = plot_df.sort_values(x_column)
            x_vals = [str(v) for v in plot_df[x_column]]
        except (ValueError, TypeError):
            try:
                plot_df[x_column] = pd.to_numeric(plot_df[x_column])
                plot_df = plot_df.sort_values(x_column)
                x_vals = [float(v) for v in plot_df[x_column]]
            except (ValueError, TypeError):
                x_vals = [str(v) for v in plot_df[x_column]]

        y_vals = pd.to_numeric(plot_df[y_column], errors="coerce").dropna()

        return {
            "chart_type": "line",
            "title": f"{y_column} over {x_column}",
            "series": [
                {
                    "label": y_column,
                    "data": [
                        {"x": x_vals[i], "y": float(y_vals.iloc[i])}
                        for i in range(min(len(x_vals), len(y_vals)))
                    ],
                }
            ],
        }

    async def heatmap(self, dataset_id: str, columns: list[str], user: User) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        missing = [c for c in columns if c not in df.columns]
        if missing:
            raise AppException(f"Columns not found: {missing}", 400)

        numeric_df = df[columns].select_dtypes(include=[np.number]).dropna()
        if len(numeric_df) < 2:
            raise AppException("Need at least 2 numeric columns with data", 400)
        if len(numeric_df.columns) < 2:
            raise AppException("Need at least 2 numeric columns", 400)

        corr = numeric_df.corr()
        labels = list(corr.columns)
        cells = []

        for i, r in enumerate(labels):
            for j, c in enumerate(labels):
                val = corr.iloc[i, j]
                if not (isinstance(val, float) and math.isnan(val)):
                    cells.append({"x": r, "y": c, "value": round(float(val), 4)})

        return {
            "chart_type": "heatmap",
            "title": "Correlation Heatmap",
            "x_labels": labels,
            "y_labels": labels,
            "cells": cells,
        }

    async def pie_chart(self, dataset_id: str, column: str, user: User, limit: int = 10) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        if column not in df.columns:
            raise AppException(f"Column '{column}' not found", 400)

        vc = df[column].value_counts().head(limit)
        total = vc.sum()
        slices = [
            {"label": str(idx), "value": int(c), "percent": round(c / total * 100, 1)}
            for idx, c in vc.items()
        ]

        return {
            "chart_type": "pie",
            "title": f"{column} Breakdown",
            "slices": slices,
        }

    async def box_plot(self, dataset_id: str, columns: list[str], user: User) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        missing = [c for c in columns if c not in df.columns]
        if missing:
            raise AppException(f"Columns not found: {missing}", 400)

        stats_list = []
        for col in columns:
            vals = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(vals) < 2:
                continue
            q1 = float(vals.quantile(0.25))
            q3 = float(vals.quantile(0.75))
            iqr = q3 - q1
            stats_list.append(
                {
                    "column": col,
                    "min": float(vals.min()),
                    "max": float(vals.max()),
                    "q1": q1,
                    "median": float(vals.median()),
                    "q3": q3,
                    "lower_fence": q1 - 1.5 * iqr,
                    "upper_fence": q3 + 1.5 * iqr,
                    "outliers": [
                        float(v)
                        for v in vals[(vals < q1 - 1.5 * iqr) | (vals > q3 + 1.5 * iqr)].tolist()
                    ],
                    "count": len(vals),
                }
            )

        return {
            "chart_type": "box",
            "title": "Box Plot",
            "statistics": stats_list,
        }

    async def grouped_bar(
        self, dataset_id: str, value_column: str, group_column: str, agg: str, user: User
    ) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        for col in (value_column, group_column):
            if col not in df.columns:
                raise AppException(f"Column '{col}' not found", 400)

        if agg == "count":
            grouped = df.groupby(group_column).size().reset_index(name="value")
        else:
            grouped = df.groupby(group_column)[value_column].agg(agg).reset_index(name="value")

        grouped = grouped.sort_values("value", ascending=False).head(20)
        labels = [str(v) for v in grouped[group_column]]
        data = [float(v) for v in grouped["value"]]

        return {
            "chart_type": "bar",
            "title": f"{agg.title()} of {value_column} by {group_column}",
            "labels": labels,
            "datasets": [
                {
                    "label": f"{agg.title()} ({value_column})",
                    "data": data,
                    "background_color": COLORS * (len(labels) // len(COLORS) + 1),
                }
            ],
        }

    async def dataset_preview(self, dataset_id: str, user: User) -> dict:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        charts = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category", "string"]).columns.tolist()

        for col in cat_cols[:3]:
            try:
                chart = await self.bar_chart(dataset_id, col, user, limit=10)
                charts.append({"chart_type": "bar", "title": chart["title"], "data": chart})
            except Exception as e:
                logger.warning("Preview bar chart skipped for '%s': %s", col, e)

        for col in numeric_cols[:2]:
            try:
                chart = await self.histogram(dataset_id, col, user)
                charts.append({"chart_type": "histogram", "title": chart["title"], "data": chart})
            except Exception as e:
                logger.warning("Preview histogram skipped for '%s': %s", col, e)

        if len(numeric_cols) >= 2:
            try:
                chart = await self.heatmap(dataset_id, numeric_cols[:5], user)
                charts.append({"chart_type": "heatmap", "title": chart["title"], "data": chart})
            except Exception as e:
                logger.warning("Preview heatmap skipped: %s", e)

        if len(numeric_cols) >= 1 and len(cat_cols) >= 1:
            try:
                chart = await self.grouped_bar(
                    dataset_id, numeric_cols[0], cat_cols[0], "mean", user
                )
                charts.append({"chart_type": "bar", "title": chart["title"], "data": chart})
            except Exception as e:
                logger.warning("Preview grouped bar skipped: %s", e)

        if len(numeric_cols) >= 1:
            try:
                chart = await self.box_plot(dataset_id, numeric_cols[:5], user)
                charts.append({"chart_type": "box", "title": chart["title"], "data": chart})
            except Exception as e:
                logger.warning("Preview box plot skipped: %s", e)

        return {
            "dataset_id": str(ds.id),
            "dataset_name": ds.name,
            "row_count": len(df),
            "column_count": len(df.columns),
            "charts": charts,
        }
