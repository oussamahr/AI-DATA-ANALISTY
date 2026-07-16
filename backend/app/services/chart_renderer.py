import io
import logging
import uuid

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from fastapi import Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.dataset import Dataset
from app.models.user import User
from app.services.analytics_service import _load_dataframe

logger = logging.getLogger("opencode.chart_renderer")

DPI = 100
FIG_WIDTH = 10
FIG_HEIGHT = 6

COLORS = [
    "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
    "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
]


class ChartRendererService:
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

    def _png_response(self, buf: io.BytesIO, filename: str) -> StreamingResponse:
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="image/png",
            headers={"Content-Disposition": f'inline; filename="{filename}.png"'},
        )

    def _apply_style(self):
        plt.rcParams.update({
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "axes.grid": True,
            "grid.alpha": 0.3,
            "font.size": 11,
        })

    async def render_bar(self, dataset_id: str, column: str, user: User, limit: int = 20) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)
        if column not in df.columns:
            raise AppException(f"Column '{column}' not found", 400)

        self._apply_style()
        vc = df[column].value_counts().head(limit)

        fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))
        bars = ax.bar(range(len(vc)), vc.values, color=COLORS[: len(vc)])
        ax.set_xticks(range(len(vc)))
        ax.set_xticklabels([str(v) for v in vc.index], rotation=45, ha="right")
        ax.set_title(f"{column} Distribution", fontsize=14, fontweight="bold")
        ax.set_ylabel("Count")
        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=DPI)
        plt.close(fig)
        return self._png_response(buf, f"{ds.name}_bar_{column}")

    async def render_histogram(self, dataset_id: str, column: str, user: User, bins: int = 20) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)
        if column not in df.columns:
            raise AppException(f"Column '{column}' not found", 400)
        if not pd.api.types.is_numeric_dtype(df[column]):
            raise AppException(f"Column '{column}' is not numeric", 400)

        self._apply_style()
        vals = df[column].dropna()
        if len(vals) == 0:
            raise AppException(f"No non-null values in '{column}'", 400)

        fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))
        ax.hist(vals, bins=bins, color=COLORS[0], edgecolor="white", alpha=0.8)
        ax.set_title(f"{column} Distribution", fontsize=14, fontweight="bold")
        ax.set_xlabel(column)
        ax.set_ylabel("Frequency")
        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=DPI)
        plt.close(fig)
        return self._png_response(buf, f"{ds.name}_histogram_{column}")

    async def render_scatter(self, dataset_id: str, x_col: str, y_col: str, user: User, limit: int = 1000) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)
        for col in (x_col, y_col):
            if col not in df.columns:
                raise AppException(f"Column '{col}' not found", 400)
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise AppException(f"Column '{col}' is not numeric", 400)

        self._apply_style()
        plot_df = df[[x_col, y_col]].dropna().head(limit)

        fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))
        ax.scatter(plot_df[x_col], plot_df[y_col], alpha=0.5, s=20, color=COLORS[1])
        ax.set_title(f"{y_col} vs {x_col}", fontsize=14, fontweight="bold")
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)
        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=DPI)
        plt.close(fig)
        return self._png_response(buf, f"{ds.name}_scatter_{x_col}_{y_col}")

    async def render_heatmap(self, dataset_id: str, columns: list[str], user: User) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)
        missing = [c for c in columns if c not in df.columns]
        if missing:
            raise AppException(f"Columns not found: {missing}", 400)

        self._apply_style()
        numeric_df = df[columns].select_dtypes(include=[np.number]).dropna()
        if len(numeric_df) < 2 or len(numeric_df.columns) < 2:
            raise AppException("Need at least 2 numeric columns with data", 400)

        corr = numeric_df.corr()

        fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))
        im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1, aspect="auto")
        ax.set_xticks(range(len(corr.columns)))
        ax.set_yticks(range(len(corr.columns)))
        ax.set_xticklabels(corr.columns, rotation=45, ha="right")
        ax.set_yticklabels(corr.columns)
        ax.set_title("Correlation Heatmap", fontsize=14, fontweight="bold")
        fig.colorbar(im, ax=ax, shrink=0.8)

        for i in range(len(corr)):
            for j in range(len(corr)):
                ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center", fontsize=8)

        fig.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=DPI)
        plt.close(fig)
        return self._png_response(buf, f"{ds.name}_heatmap")

    async def render_pie(self, dataset_id: str, column: str, user: User, limit: int = 10) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)
        if column not in df.columns:
            raise AppException(f"Column '{column}' not found", 400)

        self._apply_style()
        vc = df[column].value_counts().head(limit)

        fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))
        ax.pie(vc.values, labels=[str(v) for v in vc.index], colors=COLORS[:len(vc)], autopct="%1.1f%%")
        ax.set_title(f"{column} Breakdown", fontsize=14, fontweight="bold")
        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=DPI)
        plt.close(fig)
        return self._png_response(buf, f"{ds.name}_pie_{column}")
