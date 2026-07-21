"""
Centralized DataFrame loading and column type inference utilities.

This module consolidates all DataFrame loading and column type detection
logic to eliminate duplication across services.
"""

import math
import warnings
import csv
import io
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.core.security.exceptions import AppException

# File extension to reader function mapping
MAX_DATASET_ROWS = 500_000
TEXT_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")


def _read_delimited(path: str, sep: str | None = None):
    raw = Path(path).read_bytes()
    for encoding in TEXT_ENCODINGS:
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("latin-1")
    if sep is None:
        try:
            sep = csv.Sniffer().sniff(text[:65536], delimiters=",;\t|").delimiter
        except csv.Error:
            sep = ","
    return pd.read_csv(io.StringIO(text), sep=sep, low_memory=False, on_bad_lines="skip")


DATA_EXTENSION_READERS = {
    ".csv": _read_delimited,
    ".tsv": lambda p: _read_delimited(p, "\t"),
    ".xlsx": lambda p: pd.read_excel(p, engine="openpyxl"),
    ".xls": lambda p: pd.read_excel(p, engine="xlrd"),
    ".json": lambda p: pd.read_json(p),
    ".parquet": lambda p: pd.read_parquet(p),
    ".feather": lambda p: pd.read_feather(p),
}


def load_dataframe(file_path: str, *, enforce_cap: bool = True) -> pd.DataFrame:
    """
    Load a DataFrame from a file path with automatic format detection.
    
    Supports: CSV, TSV, Excel (xlsx/xls), JSON, Parquet, Feather
    
    Args:
        file_path: Path to the data file
        
    Returns:
        pandas DataFrame with automatic datetime parsing
        
    Raises:
        AppException: If file format is unsupported or reading fails
    """
    ext = Path(file_path).suffix.lower()
    reader = DATA_EXTENSION_READERS.get(ext)
    if reader is None:
        raise AppException(f"Unsupported file format: {ext}", 400)
    try:
        df = reader(file_path)
    except Exception as e:
        raise AppException(f"Failed to read dataset: {str(e)}", 422) from e
    
    if enforce_cap and len(df) > MAX_DATASET_ROWS:
        raise AppException(f"Dataset has {len(df):,} rows, exceeding max of {MAX_DATASET_ROWS:,}.", 413)

    # Auto-detect datetime columns in object/string columns
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


def infer_column_dtype(series: pd.Series) -> str:
    """
    Infer the semantic type of a column.
    
    Returns one of: 'boolean', 'numeric', 'datetime', 'categorical', 'text'
    """
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


def detect_column_type(series: pd.Series) -> tuple[bool, bool, bool, bool]:
    """
    Detect column types: numeric, datetime, categorical, identifier.
    
    Returns:
        Tuple of (is_numeric, is_datetime, is_categorical, is_identifier)
    """
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


def compute_histogram(series: pd.Series, bins: int = 20) -> list[dict]:
    """Compute histogram for a numeric series."""
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


def compute_top_values(series: pd.Series, limit: int = 10) -> list[dict]:
    """Compute top values for a series with counts and percentages."""
    vc = series.value_counts().head(limit)
    total = max(len(series), 1)
    return [
        {"value": str(val), "count": int(cnt), "percent": round(cnt / total * 100, 2)}
        for val, cnt in vc.items()
    ]


def compute_outliers(series: pd.Series) -> tuple[list[int], dict[str, Any]]:
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


def compute_correlations(df: pd.DataFrame) -> dict[str, dict[str, float]]:
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


def compute_distributions(df: pd.DataFrame) -> dict[str, dict[str, Any]]:
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


def compute_statistics(df: pd.DataFrame) -> dict[str, dict[str, float]]:
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


def coerce_numeric(val: Any) -> float | None:
    """Safely convert a value to float."""
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def detect_semantic_type(series: pd.Series, name: str) -> str:
    """Conservative semantic hint layered on top of the broad inferred dtype."""
    n = name.lower().replace(" ", "_")
    values = series.dropna().astype(str).str.strip()
    if not len(values):
        return infer_column_dtype(series)
    if any(x in n for x in ("percent", "percentage", "rate")):
        if pd.to_numeric(values.str.rstrip("%"), errors="coerce").notna().mean() > .8:
            return "percentage"
    if any(x in n for x in ("amount", "price", "cost", "revenue", "salary", "currency")):
        return "currency"
    if any(x in n for x in ("id", "key", "code")) or series.nunique() / max(len(series), 1) > .95:
        return "identifier"
    if values.str.lower().isin({"true", "false", "yes", "no", "y", "n"}).mean() > .8:
        return "boolean_like"
    if any(x in n for x in ("lat", "latitude", "lon", "longitude", "country", "city", "postal", "zip")):
        return "geo"
    return infer_column_dtype(series)
