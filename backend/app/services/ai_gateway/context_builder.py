"""
Context Builder - Generates comprehensive dataset context for AI prompts.

This service builds a rich context object containing all relevant dataset
information that should be included in every AI request.
"""

import json
import uuid
from datetime import datetime, UTC
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

import numpy as np
import pandas as pd
from pydantic import BaseModel

from app.core.database import get_session
from app.models.dataset import Dataset
from app.models.user import User
from app.services.analytics_service import _load_dataframe


class DatasetContext(BaseModel):
    """Complete dataset context for AI analysis."""
    
    dataset_id: str
    dataset_name: str
    description: str = ""
    row_count: int
    column_count: int
    
    columns: dict[str, ColumnContext]
    
    missing_values: dict[str, int]
    missing_percentages: dict[str, float]
    
    duplicates: int
    
    outliers: dict[str, list[int]]
    
    correlations: dict[str, dict[str, float]]
    
    distributions: dict[str, dict[str, Any]]
    
    statistics: dict[str, dict[str, float]]
    
    sample_rows: list[dict[str, Any]]
    
    quality_score: float
    completeness: float
    consistency: float
    accuracy: float
    
    generated_at: str


class ColumnContext(BaseModel):
    """Context for a single column."""
    
    dtype: str
    null_count: int
    null_percentage: float
    unique_count: int
    unique_percentage: float
    
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    
    top_values: list[dict[str, Any]] = []
    
    is_numeric: bool = False
    is_datetime: bool = False
    is_categorical: bool = False
    is_identifier: bool = False


class ContextBuilder:
    """
    Builds comprehensive dataset context for AI-powered analytics.
    
    The context includes:
    - Dataset metadata (name, rows, columns)
    - Column profiles (types, nulls, statistics)
    - Data quality metrics (completeness, duplicates, outliers)
    - Correlations between columns
    - Sample data for reference
    - Quality scores
    """
    
    def __init__(self, db_session=None):
        self.db = db_session
    
    async def _get_db(self):
        """Get database session."""
        if self.db:
            return self.db
        async for session in get_session():
            return session
        raise RuntimeError("No database session available")
    
    def _detect_column_type(self, series: pd.Series) -> tuple[bool, bool, bool, bool]:
        """Detect column types: numeric, datetime, categorical, identifier."""
        is_numeric = pd.api.types.is_numeric_dtype(series)
        is_datetime = pd.api.types.is_datetime64_any_dtype(series)
        
        n_unique = series.nunique()
        n_total = len(series)
        unique_pct = n_unique / max(n_total, 1)
        
        is_identifier = unique_pct > 0.95 and (is_numeric or series.dtype == 'object')
        
        is_categorical = False
        if not is_numeric and not is_datetime:
            if n_unique < 20 or unique_pct < 0.05:
                is_categorical = True
        
        return is_numeric, is_datetime, is_categorical, is_identifier
    
    def _compute_outliers(self, series: pd.Series) -> tuple[list[int], dict[str, Any]]:
        """Detect outliers using IQR method."""
        if not pd.api.types.is_numeric_dtype(series):
            return [], {}
        
        cleaned = series.dropna()
        if len(cleaned) < 4:
            return [], {}
        
        q1 = cleaned.quantile(0.25)
        q3 = cleaned.quantile(0.75)
        iqr = q3 - q1
        
        if iqr == 0:
            return [], {}
        
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        
        outlier_mask = (series < lower) | (series > upper)
        outlier_indices = series[outlier_mask].index.tolist()
        
        return outlier_indices, {
            "method": "iqr",
            "lower_bound": float(lower),
            "upper_bound": float(upper),
            "count": len(outlier_indices)
        }
    
    def _compute_correlations(self, df: pd.DataFrame) -> dict[str, dict[str, float]]:
        """Compute correlation matrix for numeric columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return {}
        
        corr_matrix = df[numeric_cols].corr()
        
        result = {}
        for col1 in numeric_cols:
            result[col1] = {}
            for col2 in numeric_cols:
                val = corr_matrix.loc[col1, col2]
                if pd.notna(val):
                    result[col1][col2] = round(float(val), 4)
        
        return result
    
    def _compute_distributions(self, df: pd.DataFrame) -> dict[str, dict[str, Any]]:
        """Compute distribution histograms for numeric columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        distributions = {}
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) == 0:
                continue
            
            hist, bins = np.histogram(series, bins=20)
            
            distributions[col] = {
                "bins": [
                    {"start": float(bins[i]), "end": float(bins[i+1]), "count": int(hist[i])}
                    for i in range(len(hist))
                ],
                "skewness": float(series.skew()),
                "kurtosis": float(series.kurtosis()),
            }
        
        return distributions
    
    def _compute_statistics(self, df: pd.DataFrame) -> dict[str, dict[str, float]]:
        """Compute descriptive statistics for numeric columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        statistics = {}
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) == 0:
                continue
            
            statistics[col] = {
                "count": int(series.count()),
                "mean": float(series.mean()),
                "std": float(series.std()),
                "min": float(series.min()),
                "q25": float(series.quantile(0.25)),
                "median": float(series.median()),
                "q75": float(series.quantile(0.75)),
                "max": float(series.max()),
            }
        
        return statistics
    
    async def build_context(
        self,
        dataset_id: UUID,
        user: User,
        max_sample_rows: int = 50
    ) -> DatasetContext:
        """
        Build complete dataset context for AI analysis.
        
        Args:
            dataset_id: The dataset ID
            user: The requesting user
            max_sample_rows: Maximum number of sample rows to include
            
        Returns:
            DatasetContext with all relevant information
        """
        db = await self._get_db()
        
        result = await db.execute(
            Dataset.__table__.select().where(
                Dataset.id == dataset_id,
                Dataset.is_deleted == False
            )
        )
        ds = result.scalar_one_or_none()
        
        if not ds:
            raise ValueError("Dataset not found")
        
        if user.tenant_id and ds.tenant_id != user.tenant_id:
            raise ValueError("Access denied")
        
        df = _load_dataframe(ds.file_path)
        
        columns: dict[str, ColumnContext] = {}
        missing_values: dict[str, int] = {}
        missing_percentages: dict[str, float] = {}
        outliers: dict[str, list[int]] = {}
        
        for col in df.columns:
            series = df[col]
            dtype = str(series.dtype)
            
            null_count = int(series.isna().sum())
            null_pct = round(null_count / len(df) * 100, 2) if len(df) > 0 else 0
            
            unique_count = int(series.nunique())
            unique_pct = round(unique_count / len(df) * 100, 2) if len(df) > 0 else 0
            
            is_numeric, is_datetime, is_categorical, is_identifier = self._detect_column_type(series)
            
            col_context = ColumnContext(
                dtype=dtype,
                null_count=null_count,
                null_percentage=null_pct,
                unique_count=unique_count,
                unique_percentage=unique_pct,
                is_numeric=is_numeric,
                is_datetime=is_datetime,
                is_categorical=is_categorical,
                is_identifier=is_identifier,
            )
            
            if is_numeric:
                cleaned = series.dropna()
                if len(cleaned) > 0:
                    col_context.min_value = float(cleaned.min())
                    col_context.max_value = float(cleaned.max())
                    col_context.mean = float(cleaned.mean())
                    col_context.median = float(cleaned.median())
                    col_context.std = float(cleaned.std())
                
                outlier_indices, outlier_info = self._compute_outliers(series)
                if outlier_indices:
                    outliers[col] = outlier_indices[:100]
                
                top_vals = series.value_counts().head(10).to_dict()
                col_context.top_values = {str(k): int(v) for k, v in top_vals.items()}
            elif is_categorical:
                top_vals = series.value_counts().head(10).to_dict()
                col_context.top_values = {str(k): int(v) for k, v in top_vals.items()}
            elif is_datetime:
                cleaned = series.dropna()
                if len(cleaned) > 0:
                    col_context.min_value = float(cleaned.min().timestamp())
                    col_context.max_value = float(cleaned.max().timestamp())
            
            columns[col] = col_context
            missing_values[col] = null_count
            missing_percentages[col] = null_pct
        
        duplicates = int(df.duplicated().sum())
        
        correlations = self._compute_correlations(df)
        distributions = self._compute_distributions(df)
        statistics = self._compute_statistics(df)
        
        sample_rows = df.head(max_sample_rows).to_dict(orient="records")
        sample_rows = self._convert_sample_rows(sample_rows)
        
        total_cells = len(df) * len(df.columns)
        total_missing = sum(missing_values.values())
        completeness = 1 - (total_missing / total_cells if total_cells > 0 else 0)
        
        consistency = 1.0
        for col, ctx in columns.items():
            if ctx.null_percentage > 50:
                consistency -= 0.1
            if ctx.unique_percentage > 95 and ctx.is_numeric:
                consistency -= 0.05
        consistency = max(0.0, min(1.0, consistency))
        
        accuracy = 1.0
        
        quality_score = (completeness * 0.4 + consistency * 0.3 + accuracy * 0.3)
        
        return DatasetContext(
            dataset_id=str(ds.id),
            dataset_name=ds.name,
            description=ds.description or "",
            row_count=len(df),
            column_count=len(df.columns),
            columns=columns,
            missing_values=missing_values,
            missing_percentages=missing_percentages,
            duplicates=duplicates,
            outliers=outliers,
            correlations=correlations,
            distributions=distributions,
            statistics=statistics,
            sample_rows=sample_rows,
            quality_score=round(quality_score, 4),
            completeness=round(completeness, 4),
            consistency=round(consistency, 4),
            accuracy=round(accuracy, 4),
            generated_at=datetime.now(UTC).isoformat(),
        )
    
    def _convert_sample_rows(self, rows: list[dict]) -> list[dict[str, Any]]:
        """Convert sample rows to JSON-serializable format."""
        result = []
        for row in rows:
            converted = {}
            for k, v in row.items():
                if pd.isna(v):
                    converted[k] = None
                elif isinstance(v, (pd.Timestamp, datetime)):
                    converted[k] = v.isoformat() if hasattr(v, 'isoformat') else str(v)
                elif isinstance(v, (np.integer, np.floating)):
                    converted[k] = float(v)
                elif isinstance(v, np.ndarray):
                    converted[k] = v.tolist()
                else:
                    converted[k] = v
            result.append(converted)
        return result
    
    def to_prompt_text(self, context: DatasetContext) -> str:
        """
        Convert dataset context to prompt text format.
        
        This is the format that gets sent to the AI model.
        """
        lines = [
            f"Dataset: {context.dataset_name}",
            f"Rows: {context.row_count}",
            f"Columns: {context.column_count}",
            "",
            "Column Profiles:",
        ]
        
        for col_name, col_ctx in context.columns.items():
            type_parts = []
            if col_ctx.is_numeric:
                type_parts.append("numeric")
            if col_ctx.is_datetime:
                type_parts.append("datetime")
            if col_ctx.is_categorical:
                type_parts.append("categorical")
            if col_ctx.is_identifier:
                type_parts.append("identifier")
            
            type_str = ", ".join(type_parts) if type_parts else "text"
            
            lines.append(f"  - {col_name}: {type_str}")
            lines.append(f"    Nulls: {col_ctx.null_count} ({col_ctx.null_percentage}%)")
            if col_ctx.is_numeric and col_ctx.mean is not None:
                lines.append(f"    Range: [{col_ctx.min_value}, {col_ctx.max_value}], Mean: {col_ctx.mean:.2f}")
        
        lines.extend([
            "",
            f"Quality Score: {context.quality_score:.1%}",
            f"Completeness: {context.completeness:.1%}",
            f"Duplicates: {context.duplicates} rows",
        ])
        
        if context.sample_rows:
            lines.append("")
            lines.append("Sample Rows (first 5):")
            for i, row in enumerate(context.sample_rows[:5]):
                row_str = ", ".join(f"{k}={v}" for k, v in row.items() if v is not None)
                lines.append(f"  {i+1}. {row_str}")
        
        return "\n".join(lines)
    
    def to_json(self, context: DatasetContext) -> str:
        """Convert context to JSON string for AI prompts."""
        return context.model_dump_json()


_context_builder: Optional[ContextBuilder] = None


def get_context_builder() -> ContextBuilder:
    """Get or create the global ContextBuilder instance."""
    global _context_builder
    if _context_builder is None:
        _context_builder = ContextBuilder()
    return _context_builder