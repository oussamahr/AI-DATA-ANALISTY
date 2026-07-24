"""
Context Builder - Generates comprehensive dataset context for AI prompts.

This service builds a rich context object containing all relevant dataset
information that should be included in every AI request.
"""

import json
import re
import uuid
from datetime import datetime, UTC
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

import numpy as np
import pandas as pd
from pydantic import BaseModel

from sqlalchemy import select

from app.core.config import settings
from app.models.dataset import Dataset
from app.models.user import User
from app.services.post_query_redactor import redactor
from app.services.data_loader import (
    load_dataframe,
    infer_column_dtype,
    compute_histogram,
    compute_top_values,
    compute_outliers,
    compute_correlations,
    compute_distributions,
    compute_statistics,
    detect_column_type,
)

# Prompt injection patterns for data sanitization
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?prior", re.IGNORECASE),
    re.compile(r"override\s+(your|all)\s+(rules|instructions|guidelines)", re.IGNORECASE),
    re.compile(r"act\s+as\s+(a|an)\s+unrestricted", re.IGNORECASE),
    re.compile(r"\bDAN\b.*jailbreak", re.IGNORECASE),
    re.compile(r"reveal\s+(your|the)\s+(system|original)\s+prompt", re.IGNORECASE),
    re.compile(r"output\s+(your|the)\s+(system|initial)\s+message", re.IGNORECASE),
]


def sanitize_value(value: Any) -> Any:
    """Sanitize a value for safe inclusion in AI prompts."""
    if value is None:
        return None
    if isinstance(value, str):
        # Check for injection patterns
        for pattern in INJECTION_PATTERNS:
            if pattern.search(value):
                return "[REDACTED: Potential injection detected]"
        # Escape XML/HTML special chars
        import xml.sax.saxutils as saxutils
        return saxutils.escape(value, {'"': "&quot;", "'": "&apos;"})
    if isinstance(value, (list, tuple)):
        return [sanitize_value(v) for v in value]
    if isinstance(value, dict):
        return {k: sanitize_value(v) for k, v in value.items()}
    return value


def estimate_tokens(text: str) -> int:
    """Rough token estimation: ~4 characters per token for English."""
    return len(text) // 4


def truncate_to_token_limit(text: str, max_tokens: int, reserve_tokens: int = 1000) -> str:
    """
    Truncate text to fit within token limit.
    
    Args:
        text: The text to truncate
        max_tokens: Maximum tokens allowed
        reserve_tokens: Tokens to reserve for response
    
    Returns:
        Truncated text with truncation notice if needed
    """
    available_tokens = max_tokens - reserve_tokens
    max_chars = available_tokens * 4
    
    if len(text) <= max_chars:
        return text
    
    # Truncate at sentence boundary if possible
    truncated = text[:max_chars]
    last_period = truncated.rfind('. ')
    if last_period > max_chars * 0.8:  # If we can find a period in the last 20%
        truncated = truncated[:last_period + 1]
    
    return truncated + "\n\n[... TRUNCATED: Context exceeds token limit ...]"


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
        self._redis = None
        self._cache_ttl = getattr(settings, 'AI_CACHE_TTL', 3600)  # Default 1 hour
    
    @property
    def redis(self):
        """Lazy initialization of Redis client."""
        if self._redis is None and settings.REDIS_URL:
            try:
                import redis.asyncio as redis
                self._redis = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2,
                )
            except Exception as e:
                # Log but don't fail - caching is optional
                import logging
                logging.getLogger("context_builder").warning(f"Redis unavailable: {e}")
                self._redis = False  # Mark as unavailable
        return self._redis if self._redis is not False else None
    
    def _cache_key(self, dataset_id: UUID) -> str:
        """Generate cache key for dataset context."""
        return f"ai:dataset_context:{dataset_id}"
    
    async def _get_db(self):
        """Get database session."""
        if self.db:
            return self.db
        from app.core.database import async_session_factory
        return async_session_factory()
    

    
    async def build_context(
        self,
        dataset_id: UUID,
        user: User,
        max_sample_rows: int = 50,
        use_cache: bool = True
    ) -> DatasetContext:
        """
        Build complete dataset context for AI analysis.
        
        Args:
            dataset_id: The dataset ID
            user: The requesting user
            max_sample_rows: Maximum number of sample rows to include
            use_cache: Whether to use Redis caching (default: True)
            
        Returns:
            DatasetContext with all relevant information
        """
        # Try to get from cache first
        cache_key = self._cache_key(dataset_id)
        redis = self.redis
        
        if use_cache and redis:
            try:
                cached = await redis.get(cache_key)
                if cached:
                    import logging
                    logging.getLogger("context_builder").info(f"Cache hit for dataset {dataset_id}")
                    return DatasetContext.model_validate_json(cached)
            except Exception as e:
                import logging
                logging.getLogger("context_builder").warning(f"Cache read failed: {e}")
        
        db = await self._get_db()
        
        result = await db.execute(
            select(Dataset).where(
                Dataset.id == dataset_id,
                Dataset.is_deleted == False
            )
        )
        ds = result.scalar_one_or_none()
        
        if not ds:
            raise ValueError("Dataset not found")
        
        if user.tenant_id and ds.tenant_id != user.tenant_id:
            raise ValueError("Access denied")
        
        df = load_dataframe(ds.file_path)
        
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
            
            is_numeric, is_datetime, is_categorical, is_identifier = detect_column_type(series)
            
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
                
                outlier_indices, outlier_info = compute_outliers(series)
                if outlier_indices:
                    outliers[col] = outlier_indices[:100]
                
                top_vals = series.value_counts().head(10).to_dict()
                col_context.top_values = sanitize_value({str(k): int(v) for k, v in top_vals.items()})
            elif is_categorical:
                top_vals = series.value_counts().head(10).to_dict()
                col_context.top_values = sanitize_value({str(k): int(v) for k, v in top_vals.items()})
            elif is_datetime:
                cleaned = series.dropna()
                if len(cleaned) > 0:
                    col_context.min_value = float(cleaned.min().timestamp())
                    col_context.max_value = float(cleaned.max().timestamp())
            
            columns[col] = col_context
            missing_values[col] = null_count
            missing_percentages[col] = null_pct
        
        duplicates = int(df.duplicated().sum())
        
        correlations = compute_correlations(df)
        distributions = compute_distributions(df)
        statistics = compute_statistics(df)
        
        sample_rows = redactor.redact_dataframe(df.head(max_sample_rows)).to_dict(orient="records")
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
        
        context = DatasetContext(
            dataset_id=str(ds.id),
            dataset_name=sanitize_value(ds.name),
            description=sanitize_value(ds.description or ""),
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
        
        # Write to cache
        if use_cache and redis:
            try:
                await redis.setex(cache_key, self._cache_ttl, context.model_dump_json())
                import logging
                logging.getLogger("context_builder").info(f"Cached context for dataset {dataset_id}")
            except Exception as e:
                import logging
                logging.getLogger("context_builder").warning(f"Cache write failed: {e}")
        
        return context
    
    def _convert_sample_rows(self, rows: list[dict]) -> list[dict[str, Any]]:
        """Convert sample rows to JSON-serializable format with sanitization."""
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
            # Sanitize the entire row
            result.append(sanitize_value(converted))
        return result
    
    def to_prompt_text(self, context: DatasetContext, include_full: bool = True, max_tokens: int = 8000) -> str:
        """
        Convert dataset context to prompt text format.
        
        This is the format that gets sent to the AI model.
        
        Args:
            context: The dataset context
            include_full: If True, includes correlations, distributions, outliers, statistics
            max_tokens: Maximum tokens for the prompt (will truncate if exceeded)
        """
        lines = [
            f"Dataset: {context.dataset_name}",
            f"Description: {context.description}" if context.description else "",
            f"Rows: {context.row_count:,}",
            f"Columns: {context.column_count}",
            "",
            "=== DATA QUALITY OVERVIEW ===",
            f"Quality Score: {context.quality_score:.1%} (Completeness: {context.completeness:.1%}, Consistency: {context.consistency:.1%}, Accuracy: {context.accuracy:.1%})",
            f"Duplicate Rows: {context.duplicates:,}",
            f"Total Missing Values: {sum(context.missing_values.values()):,} ({sum(context.missing_percentages.values())/len(context.missing_percentages):.1f}% avg)" if context.missing_percentages else "Total Missing Values: 0",
            "",
            "=== COLUMN PROFILES ===",
        ]
        
        # Group columns by type for better readability
        numeric_cols = [(name, ctx) for name, ctx in context.columns.items() if ctx.is_numeric]
        datetime_cols = [(name, ctx) for name, ctx in context.columns.items() if ctx.is_datetime]
        categorical_cols = [(name, ctx) for name, ctx in context.columns.items() if ctx.is_categorical]
        identifier_cols = [(name, ctx) for name, ctx in context.columns.items() if ctx.is_identifier]
        other_cols = [(name, ctx) for name, ctx in context.columns.items() 
                      if not ctx.is_numeric and not ctx.is_datetime and not ctx.is_categorical and not ctx.is_identifier]
        
        for group_name, cols in [
            ("NUMERIC", numeric_cols),
            ("DATETIME", datetime_cols),
            ("CATEGORICAL", categorical_cols),
            ("IDENTIFIER", identifier_cols),
            ("OTHER", other_cols),
        ]:
            if not cols:
                continue
            lines.append(f"\n--- {group_name} COLUMNS ({len(cols)}) ---")
            for col_name, col_ctx in cols:
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
                
                lines.append(f"  • {col_name} ({type_str})")
                lines.append(f"    Nulls: {col_ctx.null_count:,} ({col_ctx.null_percentage:.1f}%) | Unique: {col_ctx.unique_count:,} ({col_ctx.unique_percentage:.1f}%)")
                
                if col_ctx.is_numeric and col_ctx.mean is not None:
                    lines.append(f"    Range: [{col_ctx.min_value:,.4f}, {col_ctx.max_value:,.4f}] | Mean: {col_ctx.mean:,.4f} | Median: {col_ctx.median:,.4f} | Std: {col_ctx.std:,.4f}")
                    # Add quartiles if available in statistics
                    if col_name in context.statistics:
                        stats = context.statistics[col_name]
                        lines.append(f"    Quartiles: Q1={stats.get('q25', 'N/A'):,.4f}, Q3={stats.get('q75', 'N/A'):,.4f}")
                elif col_ctx.is_datetime and col_ctx.min_value is not None:
                    from datetime import datetime
                    min_dt = datetime.fromtimestamp(col_ctx.min_value).strftime('%Y-%m-%d %H:%M:%S')
                    max_dt = datetime.fromtimestamp(col_ctx.max_value).strftime('%Y-%m-%d %H:%M:%S')
                    lines.append(f"    Range: [{min_dt}] to [{max_dt}]")
                
                # Top values for categorical/identifier
                if col_ctx.top_values:
                    top_str = ", ".join(f"{k} ({v})" for k, v in list(col_ctx.top_values.items())[:5])
                    lines.append(f"    Top values: {top_str}")
                
                # Outliers
                if col_name in context.outliers and context.outliers[col_name]:
                    lines.append(f"    ⚠ Outliers: {len(context.outliers[col_name])} rows (IQR method)")
        
        # Correlations
        if include_full and context.correlations:
            lines.append("\n=== CORRELATION MATRIX (|r| > 0.3) ===")
            shown = set()
            for col1, corrs in context.correlations.items():
                for col2, val in corrs.items():
                    if col1 == col2:
                        continue
                    pair = tuple(sorted([col1, col2]))
                    if pair in shown:
                        continue
                    shown.add(pair)
                    if abs(val) > 0.3:
                        strength = "strong" if abs(val) > 0.7 else "moderate" if abs(val) > 0.5 else "weak"
                        direction = "positive" if val > 0 else "negative"
                        lines.append(f"  {col1} ↔ {col2}: r = {val:.3f} ({strength} {direction})")
        
        # Distributions (summary)
        if include_full and context.distributions:
            lines.append("\n=== DISTRIBUTION SUMMARY ===")
            for col_name, dist in list(context.distributions.items())[:10]:  # Limit to 10
                skew = dist.get('skewness', 0)
                kurt = dist.get('kurtosis', 0)
                skew_desc = "right-skewed" if skew > 1 else "left-skewed" if skew < -1 else "symmetric"
                kurt_desc = "heavy-tailed" if kurt > 1 else "light-tailed" if kurt < -1 else "normal"
                lines.append(f"  {col_name}: {skew_desc} (skew={skew:.2f}), {kurt_desc} (kurt={kurt:.2f})")
        
        # Descriptive Statistics
        if include_full and context.statistics:
            lines.append("\n=== DESCRIPTIVE STATISTICS ===")
            for col_name, stats in list(context.statistics.items())[:10]:  # Limit to 10
                lines.append(
                    f"  {col_name}: n={stats.get('count', 0):,}, "
                    f"μ={stats.get('mean', 0):.4f}, σ={stats.get('std', 0):.4f}, "
                    f"min={stats.get('min', 0):.4f}, "
                    f"Q1={stats.get('q25', 0):.4f}, "
                    f"median={stats.get('median', 0):.4f}, "
                    f"Q3={stats.get('q75', 0):.4f}, "
                    f"max={stats.get('max', 0):.4f}"
                )
        
        # Sample Rows
        if context.sample_rows:
            lines.append(f"\n=== SAMPLE ROWS (first {min(10, len(context.sample_rows))} of {len(context.sample_rows)}) ===")
            for i, row in enumerate(context.sample_rows[:10]):
                # Show all columns for first few rows
                row_items = []
                for k, v in row.items():
                    if v is not None:
                        if isinstance(v, float):
                            row_items.append(f"{k}={v:.4f}")
                        else:
                            row_items.append(f"{k}={v}")
                lines.append(f"  Row {i+1}: {', '.join(row_items)}")
        
        # Data Quality Issues Summary
        lines.append("\n=== DATA QUALITY FLAGS ===")
        issues_found = False
        for col_name, col_ctx in context.columns.items():
            if col_ctx.null_percentage > 20:
                lines.append(f"  ⚠ {col_name}: {col_ctx.null_percentage:.1f}% missing values")
                issues_found = True
            if col_name in context.outliers and context.outliers[col_name]:
                lines.append(f"  ⚠ {col_name}: {len(context.outliers[col_name])} outliers detected")
                issues_found = True
            if col_ctx.is_identifier and col_ctx.unique_percentage < 90:
                lines.append(f"  ⚠ {col_name}: Marked as identifier but only {col_ctx.unique_percentage:.1f}% unique")
                issues_found = True
        if not issues_found:
            lines.append("  No major data quality issues detected")
        
        result = "\n".join(line for line in lines if line is not None)
        
        # Apply token limit truncation if needed
        return truncate_to_token_limit(result, max_tokens)
    
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