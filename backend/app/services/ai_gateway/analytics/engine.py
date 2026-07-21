"""
AI Analytics Engine - Advanced analytics capabilities.

Implements smart dataset analysis, data quality, insights, forecasting,
anomaly detection, chart recommendation, NL query, reports, and dashboards.
"""

import json
import logging
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security.exceptions import AppException
from app.models.dataset import Dataset
from app.models.user import User
from app.services.ai_gateway import (
    AIGateway,
    ChatMessage,
    GenerationConfig,
    MessageRole,
    ProviderType,
    VisionInput,
    get_ai_gateway,
)
from app.services.ai_gateway.memory import ConversationMemory, get_conversation_memory
from app.services.ai_gateway.prompts import PromptLibrary, get_prompt_library
from app.services.analytics_service import _load_dataframe, load_dataframe

logger = logging.getLogger("ai_gateway.analytics")


# ==================== Pydantic Models ====================

class DatasetProfile(BaseModel):
    """Complete dataset profile generated on upload."""
    dataset_id: UUID
    dataset_name: str
    row_count: int
    column_count: int
    columns: dict[str, Any]
    missing_values: dict[str, int]
    duplicates: int
    outliers: dict[str, list]
    correlation_matrix: dict[str, Any]
    distributions: dict[str, Any]
    statistics: dict[str, Any]
    quality_score: float
    completeness: float
    consistency: float
    accuracy: float
    business_summary: str
    suggested_charts: list[dict[str, Any]]
    suggested_kpis: list[dict[str, Any]]
    suggested_dashboards: list[dict[str, Any]]
    generated_at: datetime


class DataQualityReport(BaseModel):
    """Data quality assessment report."""
    dataset_id: UUID
    overall_score: float
    completeness: float
    consistency: float
    accuracy: float
    validity: float
    uniqueness: float
    issues: list[dict[str, Any]]
    suggestions: list[dict[str, Any]]
    column_scores: dict[str, float]


class Insight(BaseModel):
    """An intelligent insight."""
    type: str
    severity: str
    title: str
    description: str
    details: dict[str, Any] = {}
    recommendation: Optional[str] = None
    confidence: float = 1.0
    supporting_data: dict[str, Any] = {}


class InsightsReport(BaseModel):
    """Ranked insights report."""
    dataset_id: UUID
    insights: list[Insight]
    summary: str
    generated_at: datetime


class CleaningAction(BaseModel):
    """A data cleaning action."""
    operation: str
    column: str
    parameters: dict[str, Any] = {}
    description: str
    reversible: bool = True
    estimated_rows_affected: int = 0


class CleaningPlan(BaseModel):
    """Executable data cleaning plan."""
    steps: list[CleaningAction]
    execution_order: list[int]
    rollback_plan: str
    validation_queries: list[str]


class ForecastResult(BaseModel):
    """Forecasting result."""
    model: str
    forecast: list[dict[str, Any]]
    accuracy_metrics: dict[str, float]
    trend: str
    seasonality_detected: bool
    confidence_intervals: list[dict[str, float]]
    assumptions: list[str]
    risks: list[str]


class AnomalyReport(BaseModel):
    """Anomaly detection report."""
    point_anomalies: list[dict[str, Any]]
    contextual_anomalies: list[dict[str, Any]]
    collective_anomalies: list[dict[str, Any]]
    fraud_indicators: list[dict[str, Any]]
    summary: dict[str, Any]


class ChartRecommendation(BaseModel):
    """Chart recommendation."""
    chart_type: str
    title: str
    description: str
    x_column: Optional[str] = None
    y_columns: list[str] = []
    color_column: Optional[str] = None
    facet_column: Optional[str] = None
    reason: str
    priority: int
    config: dict[str, Any] = {}


class ChartRecommendations(BaseModel):
    """Chart recommendations for a dataset."""
    recommendations: list[ChartRecommendation]
    dashboard_layout: list[dict[str, Any]]
    color_scheme: str
    accessibility_notes: list[str]


class SQLQueryResult(BaseModel):
    """Natural language to SQL result."""
    sql: str
    explanation: str
    is_safe: bool
    estimated_rows: int
    columns: list[str]


class ReportContent(BaseModel):
    """Generated report content."""
    title: str
    content: str
    format: str
    sections: list[dict[str, Any]]
    generated_at: datetime


class DashboardSpec(BaseModel):
    """Dashboard specification."""
    dashboard: dict[str, Any]
    kpis: list[dict[str, Any]]
    charts: list[dict[str, Any]]
    filters: list[dict[str, Any]]
    tabs: list[dict[str, Any]]
    insights_panel: bool
    export_enabled: bool


# ==================== AI Analytics Engine ====================

class AIAnalyticsEngine:
    """
    Main AI Analytics Engine.

    Provides all advanced AI-powered analytics capabilities:
    - Smart dataset profiling on upload
    - Data quality engine
    - Automatic insights generation
    - AI-powered data cleaning
    - Predictive analytics/forecasting
    - Anomaly detection
    - Chart recommendation
    - Natural language to SQL
    - Report generation
    - Dashboard generation
    """

    def __init__(
        self,
        db: AsyncSession = None,
        gateway: AIGateway = None,
        memory: ConversationMemory = None,
        prompts: PromptLibrary = None,
    ):
        self.db = db
        self.gateway = gateway or get_ai_gateway()
        self.memory = memory or get_conversation_memory()
        self.prompts = prompts or get_prompt_library()

    async def _get_db(self) -> AsyncSession:
        """Get database session."""
        if self.db:
            return self.db
        from app.core.database import async_session_factory
        return async_session_factory()

    async def _get_dataset(self, dataset_id: UUID, user: User) -> Dataset:
        """Get dataset with access check."""
        db = await self._get_db()
        result = await db.execute(
            select(Dataset).where(Dataset.id == dataset_id, Dataset.is_deleted == False)
        )
        ds = result.scalar_one_or_none()
        if not ds:
            raise AppException("Dataset not found", 404)
        if user.tenant_id and ds.tenant_id != user.tenant_id:
            raise AppException("Access denied", 403)
        return ds

    def _prepare_dataset_context(self, df: pd.DataFrame, max_rows: int = 50) -> dict[str, Any]:
        """Prepare dataset context for AI prompts."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category", "string"]).columns.tolist()
        date_cols = df.select_dtypes(include=["datetime64[ns]", "datetime64[us]", "datetime64[ms]"]).columns.tolist()

        # Column profiles
        columns = {}
        for col in df.columns:
            series = df[col]
            dtype = str(series.dtype)
            null_count = int(series.isna().sum())
            unique_count = int(series.nunique())

            col_info = {
                "dtype": dtype,
                "null_count": null_count,
                "null_pct": round(null_count / len(df) * 100, 2),
                "unique_count": unique_count,
                "unique_pct": round(unique_count / len(df) * 100, 2),
            }

            if dtype in ["int64", "float64", "int32", "float32"]:
                col_info.update({
                    "min": float(series.min()) if not series.isna().all() else None,
                    "max": float(series.max()) if not series.isna().all() else None,
                    "mean": float(series.mean()) if not series.isna().all() else None,
                    "median": float(series.median()) if not series.isna().all() else None,
                    "std": float(series.std()) if not series.isna().all() else None,
                })
            elif str(dtype).startswith("datetime64"):
                col_info.update({
                    "min": str(series.min()) if not series.isna().all() else None,
                    "max": str(series.max()) if not series.isna().all() else None,
                })
            else:
                top_values = series.value_counts().head(10).to_dict()
                col_info["top_values"] = {str(k): int(v) for k, v in top_values.items()}

            columns[col] = col_info

        # Correlation matrix for numeric columns
        corr_matrix = {}
        if len(numeric_cols) >= 2:
            corr = df[numeric_cols].corr()
            corr_matrix = corr.round(4).to_dict()

        # Sample rows
        sample = df.head(max_rows).to_dict(orient="records")

        return {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": columns,
            "numeric_columns": numeric_cols,
            "categorical_columns": cat_cols,
            "datetime_columns": date_cols,
            "correlation_matrix": corr_matrix,
            "sample_rows": sample,
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
        }

    # ==================== SMART DATASET ANALYSIS ====================

    async def profile_dataset_on_upload(
        self,
        dataset_id: UUID,
        user: User,
    ) -> DatasetProfile:
        """
        Generate comprehensive dataset profile immediately after upload.

        This is the "smart dataset analysis" feature that runs automatically
        when a dataset is uploaded.
        """
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)

        context = self._prepare_dataset_context(df)

        # Use AI to generate business summary and suggestions
        prompt = self.prompts.render_prompt(
            "explain_dataset",
            dataset_profile=json.dumps(context, default=str),
            sample_rows=json.dumps(context["sample_rows"][:10], default=str),
            column_descriptions=json.dumps(context["columns"], default=str),
        )

        response = await self.gateway.generate(
            prompt=prompt,
            system_prompt="You are an expert data analyst. Provide clear, actionable insights.",
            config=GenerationConfig(temperature=0.3, max_tokens=4096),
        )

        # Parse AI response for structured data
        ai_content = response.content

        # Calculate quality metrics
        missing_values = {col: context["columns"][col]["null_count"] for col in context["columns"]}
        total_cells = context["row_count"] * context["column_count"]
        total_missing = sum(missing_values.values())
        completeness = 1 - (total_missing / total_cells if total_cells > 0 else 0)

        # Duplicates
        duplicates = int(df.duplicated().sum())

        # Outliers (IQR method)
        outliers = {}
        for col in context["numeric_columns"]:
            series = df[col].dropna()
            if len(series) > 0:
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outlier_mask = (series < lower) | (series > upper)
                outlier_indices = series[outlier_mask].index.tolist()
                if outlier_indices:
                    outliers[col] = outlier_indices[:100]  # Limit to 100

        # Distributions
        distributions = {}
        for col in context["numeric_columns"]:
            series = df[col].dropna()
            if len(series) > 0:
                hist, bins = np.histogram(series, bins=20)
                distributions[col] = {
                    "bins": [{"start": float(bins[i]), "end": float(bins[i+1]), "count": int(hist[i])} for i in range(len(hist))],
                    "skewness": float(series.skew()),
                    "kurtosis": float(series.kurtosis()),
                }

        # Statistics
        statistics = {}
        for col in context["numeric_columns"]:
            series = df[col].dropna()
            if len(series) > 0:
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

        # Quality score (weighted)
        consistency = 1.0  # Placeholder - would check format consistency
        accuracy = 1.0  # Placeholder - would check against reference data
        quality_score = (completeness * 0.4 + consistency * 0.3 + accuracy * 0.3)

        profile = DatasetProfile(
            dataset_id=dataset_id,
            dataset_name=ds.name,
            row_count=context["row_count"],
            column_count=context["column_count"],
            columns=context["columns"],
            missing_values=missing_values,
            duplicates=duplicates,
            outliers=outliers,
            correlation_matrix=context["correlation_matrix"],
            distributions=distributions,
            statistics=statistics,
            quality_score=round(quality_score, 4),
            completeness=round(completeness, 4),
            consistency=round(consistency, 4),
            accuracy=round(accuracy, 4),
            business_summary=ai_content[:2000] if ai_content else "Analysis completed",
            suggested_charts=self._generate_chart_suggestions(context),
            suggested_kpis=await self._generate_kpi_suggestions(context, ds.name),
            suggested_dashboards=await self._generate_dashboard_suggestions(context, ds.name),
            generated_at=datetime.now(UTC),
        )

        # Store in database (using analysis_results table)
        await self._store_profile(dataset_id, user, profile)

        return profile

    def _generate_chart_suggestions(self, context: dict) -> list[dict[str, Any]]:
        """Generate chart suggestions based on data types."""
        suggestions = []
        numeric = context["numeric_columns"]
        categorical = context["categorical_columns"]
        datetime_cols = context["datetime_columns"]

        # Time series
        if datetime_cols and numeric:
            for dt_col in datetime_cols[:2]:
                for num_col in numeric[:3]:
                    suggestions.append({
                        "chart_type": "line",
                        "title": f"{num_col} over {dt_col}",
                        "x_column": dt_col,
                        "y_columns": [num_col],
                        "reason": "Time series trend analysis",
                        "priority": 1,
                    })

        # Categorical vs numeric
        if categorical and numeric:
            for cat_col in categorical[:3]:
                for num_col in numeric[:3]:
                    suggestions.append({
                        "chart_type": "bar",
                        "title": f"{num_col} by {cat_col}",
                        "x_column": cat_col,
                        "y_columns": [num_col],
                        "reason": "Compare numeric values across categories",
                        "priority": 2,
                    })

        # Correlation heatmap
        if len(numeric) >= 3:
            suggestions.append({
                "chart_type": "heatmap",
                "title": "Correlation Matrix",
                "x_column": None,
                "y_columns": numeric[:10],
                "reason": "Identify relationships between numeric variables",
                "priority": 3,
            })

        # Distributions
        for num_col in numeric[:3]:
            suggestions.append({
                "chart_type": "histogram",
                "title": f"Distribution of {num_col}",
                "x_column": num_col,
                "y_columns": [],
                "reason": "Understand data distribution",
                "priority": 4,
            })

        # Scatter plots for correlated pairs
        if len(numeric) >= 2:
            corr = context["correlation_matrix"]
            for i, c1 in enumerate(numeric):
                for c2 in numeric[i+1:]:
                    val = corr.get(c1, {}).get(c2, 0)
                    if abs(val) > 0.5:
                        suggestions.append({
                            "chart_type": "scatter",
                            "title": f"{c2} vs {c1} (corr: {val:.2f})",
                            "x_column": c1,
                            "y_columns": [c2],
                            "reason": f"Strong correlation ({val:.2f})",
                            "priority": 2,
                        })

        return suggestions[:15]

    async def _generate_kpi_suggestions(self, context: dict, dataset_name: str) -> list[dict[str, Any]]:
        """Generate KPI suggestions using AI."""
        prompt = self.prompts.render_prompt(
            "kpi_generation",
            dataset_profile=json.dumps(context, default=str),
            business_domain="general",
            business_goals="Monitor key metrics and performance",
            available_columns=json.dumps(list(context["columns"].keys())),
        )

        response = await self.gateway.structured_generate(
            prompt=prompt,
            response_model=dict,
            config=GenerationConfig(temperature=0.2, max_tokens=2048),
        )

        kpis = response[0].get("kpis", [])
        return kpis[:10]

    async def _generate_dashboard_suggestions(self, context: dict, dataset_name: str) -> list[dict[str, Any]]:
        """Generate dashboard suggestions."""
        return [
            {
                "title": "Overview Dashboard",
                "description": "High-level KPIs and trends",
                "charts": [s for s in self._generate_chart_suggestions(context) if s["priority"] <= 2][:6],
            },
            {
                "title": "Deep Dive Dashboard",
                "description": "Detailed analysis and correlations",
                "charts": [s for s in self._generate_chart_suggestions(context) if s["priority"] > 2][:6],
            },
        ]

    async def _store_profile(self, dataset_id: UUID, user: User, profile: DatasetProfile) -> None:
        """Store profile in database."""
        db = await self._get_db()
        from app.models.analysis import AnalysisResult, AnalysisRun

        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=dataset_id,
            user_id=user.id,
            analysis_type="smart_profile",
            status="completed",
            completed_at=datetime.now(UTC),
        )
        db.add(run)
        await db.commit()

        result = AnalysisResult(
            id=uuid.uuid4(),
            analysis_run_id=run.id,
            dataset_id=dataset_id,
            result_type="dataset_profile",
            data=profile.model_dump(),
            metadata={"auto_generated": True},
        )
        db.add(result)
        await db.commit()

    # ==================== DATA QUALITY ENGINE ====================

    async def assess_data_quality(
        self,
        dataset_id: UUID,
        user: User,
    ) -> DataQualityReport:
        """Comprehensive data quality assessment."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        # Use AI to identify issues
        prompt = self.prompts.render_prompt(
            "data_cleaning_suggestions",
            dataset_profile=json.dumps(context, default=str),
            column_profiles=json.dumps(context["columns"], default=str),
            sample_data=json.dumps(context["sample_rows"][:20], default=str),
        )

        response = await self.gateway.structured_generate(
            prompt=prompt,
            response_model=dict,
            config=GenerationConfig(temperature=0.1, max_tokens=4096),
        )

        issues = response[0].get("issues", [])

        # Calculate column scores
        column_scores = {}
        for col in context["columns"]:
            col_issues = [i for i in issues if i.get("column") == col]
            severity_weights = {"high": 0.3, "medium": 0.15, "low": 0.05}
            penalty = sum(severity_weights.get(i.get("severity", "low"), 0.05) for i in col_issues)
            column_scores[col] = max(0.0, 1.0 - penalty)

        overall_score = np.mean(list(column_scores.values())) if column_scores else 1.0

        return DataQualityReport(
            dataset_id=dataset_id,
            overall_score=round(overall_score, 4),
            completeness=round(1 - sum(context["missing_values"].values()) / (context["row_count"] * context["column_count"]), 4),
            consistency=round(np.mean([s for s in column_scores.values()]), 4),
            accuracy=1.0,  # Would need reference data
            validity=round(overall_score, 4),
            uniqueness=round(1 - context["duplicates"] / context["row_count"] if context["row_count"] > 0 else 1.0, 4),
            issues=issues,
            suggestions=response[0].get("suggestions", []),
            column_scores=column_scores,
        )

    # ==================== AUTOMATIC INSIGHTS ====================

    async def generate_insights(
        self,
        dataset_id: UUID,
        user: User,
        max_insights: int = 10,
    ) -> InsightsReport:
        """Generate intelligent, ranked insights."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        # Use the AI insights prompt
        prompt = self.prompts.render_prompt(
            "explain_dataset",
            dataset_profile=json.dumps(context, default=str),
            sample_rows=json.dumps(context["sample_rows"][:20], default=str),
            column_descriptions=json.dumps(context["columns"], default=str),
        )

        response = await self.gateway.generate(
            prompt=prompt,
            config=GenerationConfig(temperature=0.4, max_tokens=4096),
        )

        # Parse insights from AI response
        # For now, create structured insights from the response
        insights = self._parse_insights(response.content, context)

        # Rank by severity and confidence
        insights.sort(key=lambda x: ({"high": 3, "medium": 2, "low": 1}[x.severity], x.confidence), reverse=True)

        return InsightsReport(
            dataset_id=dataset_id,
            insights=insights[:max_insights],
            summary=f"Generated {len(insights)} insights for {ds.name}",
            generated_at=datetime.now(UTC),
        )

    def _parse_insights(self, ai_response: str, context: dict) -> list[Insight]:
        """Parse insights from AI response."""
        insights = []

        # Extract key patterns from correlation matrix
        corr = context["correlation_matrix"]
        for c1 in corr:
            for c2 in corr[c1]:
                val = corr[c1][c2]
                if abs(val) > 0.7:
                    insights.append(Insight(
                        type="correlation",
                        severity="high" if abs(val) > 0.9 else "medium",
                        title=f"Strong {'positive' if val > 0 else 'negative'} correlation",
                        description=f"{c1} and {c2} have correlation of {val:.2f}",
                        details={"column_1": c1, "column_2": c2, "correlation": val},
                        recommendation=f"Consider using {c1} to predict {c2}" if val > 0 else f"Investigate inverse relationship",
                        confidence=min(abs(val), 0.95),
                    ))

        # Check for high missing values
        for col, null_count in context["columns"].items():
            null_pct = null_count.get("null_pct", 0)
            if null_pct > 50:
                insights.append(Insight(
                    type="data_quality",
                    severity="high",
                    title=f"High missing values in {col}",
                    description=f"{null_pct:.1f}% of values are missing",
                    details={"column": col, "missing_pct": null_pct},
                    recommendation="Consider imputation or column removal",
                    confidence=0.9,
                ))
            elif null_pct > 20:
                insights.append(Insight(
                    type="data_quality",
                    severity="medium",
                    title=f"Moderate missing values in {col}",
                    description=f"{null_pct:.1f}% of values are missing",
                    details={"column": col, "missing_pct": null_pct},
                    recommendation="Review imputation strategy",
                    confidence=0.8,
                ))

        # Check for potential ID columns (high uniqueness)
        for col, info in context["columns"].items():
            if info.get("unique_pct", 0) > 95 and info.get("dtype") in ["int64", "object"]:
                insights.append(Insight(
                    type="pattern",
                    severity="low",
                    title=f"Potential identifier column: {col}",
                    description=f"{info['unique_pct']:.1f}% unique values",
                    details={"column": col, "unique_pct": info["unique_pct"]},
                    recommendation="Verify if this is a primary key",
                    confidence=0.7,
                ))

        return insights

    # ==================== AI DATA CLEANING ====================

    async def suggest_cleaning_plan(
        self,
        dataset_id: UUID,
        user: User,
    ) -> CleaningPlan:
        """Generate executable data cleaning plan."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        # Get issues from quality assessment
        quality = await self.assess_data_quality(dataset_id, user)

        prompt = self.prompts.render_prompt(
            "one_click_cleaning_plan",
            issues_json=json.dumps(quality.issues, default=str),
            dataset_profile=json.dumps(context, default=str),
        )

        response = await self.gateway.structured_generate(
            prompt=prompt,
            response_model=dict,
            config=GenerationConfig(temperature=0.1, max_tokens=4096),
        )

        steps_data = response[0].get("steps", [])
        steps = [CleaningAction(**s) for s in steps_data]

        return CleaningPlan(
            steps=steps,
            execution_order=response[0].get("execution_order", list(range(1, len(steps)+1))),
            rollback_plan=response[0].get("rollback_plan", "Restore from backup"),
            validation_queries=response[0].get("validation_queries", []),
        )

    async def execute_cleaning_plan(
        self,
        dataset_id: UUID,
        user: User,
        plan: CleaningPlan,
    ) -> dict[str, Any]:
        """Execute a cleaning plan and return results."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        original_shape = df.shape

        results = {"steps_executed": [], "rows_affected": 0, "errors": []}

        for step in plan.steps:
            try:
                if step.operation == "drop_duplicates":
                    before = len(df)
                    df = df.drop_duplicates()
                    results["steps_executed"].append(f"Dropped {before - len(df)} duplicate rows")
                    results["rows_affected"] += before - len(df)

                elif step.operation == "fill_missing":
                    col = step.column
                    method = step.parameters.get("method", "median")
                    if method == "median" and col in df.select_dtypes(include=[np.number]).columns:
                        df[col] = df[col].fillna(df[col].median())
                    elif method == "mean" and col in df.select_dtypes(include=[np.number]).columns:
                        df[col] = df[col].fillna(df[col].mean())
                    elif method == "mode":
                        df[col] = df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else "")
                    elif method == "constant":
                        df[col] = df[col].fillna(step.parameters.get("value", ""))
                    results["steps_executed"].append(f"Filled missing in {col} using {method}")

                elif step.operation == "convert_type":
                    col = step.column
                    target_type = step.parameters.get("target_type", "string")
                    if target_type == "datetime":
                        df[col] = pd.to_datetime(df[col], errors="coerce")
                    elif target_type == "numeric":
                        df[col] = pd.to_numeric(df[col], errors="coerce")
                    elif target_type == "string":
                        df[col] = df[col].astype(str)
                    results["steps_executed"].append(f"Converted {col} to {target_type}")

                elif step.operation == "standardize_format":
                    col = step.column
                    fmt = step.parameters.get("format", "lower")
                    if fmt == "lower":
                        df[col] = df[col].str.lower()
                    elif fmt == "upper":
                        df[col] = df[col].str.upper()
                    elif fmt == "title":
                        df[col] = df[col].str.title()
                    results["steps_executed"].append(f"Standardized {col} to {fmt}case")

                elif step.operation == "remove_outliers":
                    col = step.column
                    method = step.parameters.get("method", "iqr")
                    if method == "iqr" and col in df.select_dtypes(include=[np.number]).columns:
                        series = df[col].dropna()
                        q1 = series.quantile(0.25)
                        q3 = series.quantile(0.75)
                        iqr = q3 - q1
                        lower = q1 - 1.5 * iqr
                        upper = q3 + 1.5 * iqr
                        before = len(df)
                        df = df[(df[col] >= lower) & (df[col] <= upper) | df[col].isna()]
                        results["steps_executed"].append(f"Removed {before - len(df)} outliers from {col} (IQR)")
                        results["rows_affected"] += before - len(df)

                elif step.operation == "trim_whitespace":
                    col = step.column
                    if df[col].dtype == "object":
                        df[col] = df[col].str.strip()
                    results["steps_executed"].append(f"Trimmed whitespace from {col}")

                elif step.operation == "normalize_case":
                    col = step.column
                    case = step.parameters.get("case", "lower")
                    if df[col].dtype == "object":
                        if case == "lower":
                            df[col] = df[col].str.lower()
                        elif case == "upper":
                            df[col] = df[col].str.upper()
                    results["steps_executed"].append(f"Normalized {col} to {case}case")

            except Exception as e:
                results["errors"].append(f"Step {step.operation} on {step.column}: {str(e)}")

        # Save cleaned dataset as new version
        # For now, just return results
        results["original_shape"] = original_shape
        results["final_shape"] = df.shape

        return results

    # ==================== PREDICTIVE ANALYTICS ====================

    async def forecast(
        self,
        dataset_id: UUID,
        user: User,
        date_column: str,
        value_column: str,
        periods: int = 12,
        confidence: float = 0.95,
    ) -> ForecastResult:
        """Generate time series forecast."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)

        # Prepare historical data for prompt
        historical = df[[date_column, value_column]].dropna().tail(100)
        historical_data = historical.to_dict(orient="records")

        prompt = self.prompts.render_prompt(
            "forecast_revenue",
            historical_data=json.dumps(historical_data, default=str),
            date_column=date_column,
            revenue_column=value_column,
            forecast_periods=periods,
            confidence_level=confidence,
        )

        response = await self.gateway.structured_generate(
            prompt=prompt,
            response_model=dict,
            config=GenerationConfig(temperature=0.2, max_tokens=2048),
        )

        forecast_data = response[0]
        return ForecastResult(
            model=forecast_data.get("model_used", "AI Forecast"),
            forecast=forecast_data.get("forecast", []),
            accuracy_metrics=forecast_data.get("accuracy_metrics", {}),
            trend=forecast_data.get("trend", "stable"),
            seasonality_detected=forecast_data.get("seasonality_detected", False),
            confidence_intervals=[],
            assumptions=forecast_data.get("key_assumptions", []),
            risks=forecast_data.get("risks", []),
        )

    # ==================== ANOMALY DETECTION ====================

    async def detect_anomalies(
        self,
        dataset_id: UUID,
        user: User,
    ) -> AnomalyReport:
        """Detect anomalies in dataset."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        prompt = self.prompts.render_prompt(
            "anomaly_detection",
            dataset_profile=json.dumps(context, default=str),
            sample_data=json.dumps(context["sample_rows"][:50], default=str),
            numeric_columns=json.dumps(context["numeric_columns"]),
            categorical_columns=json.dumps(context["categorical_columns"]),
            time_column=json.dumps(context["datetime_columns"]),
        )

        response = await self.gateway.structured_generate(
            prompt=prompt,
            response_model=dict,
            config=GenerationConfig(temperature=0.2, max_tokens=4096),
        )

        anomaly_data = response[0]
        return AnomalyReport(
            point_anomalies=anomaly_data.get("point_anomalies", []),
            contextual_anomalies=anomaly_data.get("contextual_anomalies", []),
            collective_anomalies=anomaly_data.get("collective_anomalies", []),
            fraud_indicators=anomaly_data.get("fraud_indicators", []),
            summary=anomaly_data.get("summary", {}),
        )

    # ==================== CHART RECOMMENDATION ====================

    async def recommend_charts(
        self,
        dataset_id: UUID,
        user: User,
        analysis_goal: str = "exploratory",
        audience: str = "analyst",
    ) -> ChartRecommendations:
        """Recommend optimal visualizations."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        prompt = self.prompts.render_prompt(
            "chart_recommendation",
            dataset_profile=json.dumps(context, default=str),
            column_profiles=json.dumps(context["columns"], default=str),
            analysis_goal=analysis_goal,
            audience=audience,
        )

        response = await self.gateway.structured_generate(
            prompt=prompt,
            response_model=dict,
            config=GenerationConfig(temperature=0.3, max_tokens=2048),
        )

        chart_data = response[0]
        recommendations = [ChartRecommendation(**c) for c in chart_data.get("recommendations", [])]

        return ChartRecommendations(
            recommendations=recommendations,
            dashboard_layout=chart_data.get("dashboard_layout", []),
            color_scheme=chart_data.get("color_scheme", "categorical"),
            accessibility_notes=chart_data.get("accessibility_notes", []),
        )

    # ==================== NATURAL LANGUAGE QUERY ====================

    async def natural_language_to_sql(
        self,
        dataset_id: UUID,
        user: User,
        question: str,
    ) -> SQLQueryResult:
        """Convert natural language to safe SQL."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)

        # Build schema info
        schema = {}
        for col in df.columns:
            dtype = str(df[col].dtype)
            schema[col] = dtype

        sample_data = df.head(5).to_dict(orient="records")

        prompt = self.prompts.render_prompt(
            "natural_language_to_sql",
            question=question,
            schema=json.dumps(schema, default=str),
            sample_data=json.dumps(sample_data, default=str),
            dialect="postgresql",
        )

        response = await self.gateway.generate(
            prompt=prompt,
            config=GenerationConfig(temperature=0.1, max_tokens=2048),
        )

        sql = response.content.strip()

        # Validate SQL safety
        is_safe = self._validate_sql_safety(sql)

        return SQLQueryResult(
            sql=sql,
            explanation="",  # Could add separate explanation call
            is_safe=is_safe,
            estimated_rows=0,
            columns=[],
        )

    def _validate_sql_safety(self, sql: str) -> bool:
        """Validate SQL contains only safe operations."""
        sql_upper = sql.upper()
        dangerous = ["DELETE", "UPDATE", "DROP", "ALTER", "TRUNCATE", "INSERT", "CREATE", "REPLACE", "MERGE"]
        for keyword in dangerous:
            if keyword in sql_upper:
                return False
        return "SELECT" in sql_upper or "WITH" in sql_upper

    async def explain_sql(
        self,
        dataset_id: UUID,
        user: User,
        sql: str,
    ) -> str:
        """Explain SQL in plain language."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)

        schema = {}
        for col in df.columns:
            schema[col] = str(df[col].dtype)

        prompt = self.prompts.render_prompt(
            "explain_sql",
            sql_query=sql,
            schema=json.dumps(schema, default=str),
        )

        response = await self.gateway.generate(
            prompt=prompt,
            config=GenerationConfig(temperature=0.2, max_tokens=2048),
        )

        return response.content

    # ==================== REPORT GENERATION ====================

    async def generate_executive_report(
        self,
        dataset_id: UUID,
        user: User,
        time_period: str = "Last 30 days",
    ) -> ReportContent:
        """Generate executive report."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        # Get insights
        insights_report = await self.generate_insights(dataset_id, user)

        key_metrics = {
            "Total Rows": context["row_count"],
            "Columns": context["column_count"],
            "Quality Score": f"{context.get('quality_score', 0):.1%}",
            "Missing Data": f"{sum(context['missing_values'].values()) / (context['row_count'] * context['column_count']):.1%}",
        }

        prompt = self.prompts.render_prompt(
            "executive_report",
            dataset_name=ds.name,
            analysis_results=json.dumps(context, default=str),
            key_metrics=json.dumps(key_metrics, default=str),
            insights=json.dumps([i.model_dump() for i in insights_report.insights], default=str),
            recommendations="See insights for recommendations",
            time_period=time_period,
        )

        response = await self.gateway.generate(
            prompt=prompt,
            config=GenerationConfig(temperature=0.3, max_tokens=4096),
        )

        return ReportContent(
            title=f"Executive Report: {ds.name}",
            content=response.content,
            format="markdown",
            sections=[],
            generated_at=datetime.now(UTC),
        )

    async def generate_technical_report(
        self,
        dataset_id: UUID,
        user: User,
    ) -> ReportContent:
        """Generate technical report."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        prompt = self.prompts.render_prompt(
            "technical_report",
            dataset_name=ds.name,
            analysis_methodology="Automated AI analysis using LLM",
            data_quality=json.dumps(context, default=str),
            statistical_results=json.dumps(context["statistics"], default=str),
            model_details="N/A",
            code_snippets="N/A",
        )

        response = await self.gateway.generate(
            prompt=prompt,
            config=GenerationConfig(temperature=0.2, max_tokens=4096),
        )

        return ReportContent(
            title=f"Technical Report: {ds.name}",
            content=response.content,
            format="markdown",
            sections=[],
            generated_at=datetime.now(UTC),
        )

    async def generate_business_report(
        self,
        dataset_id: UUID,
        user: User,
    ) -> ReportContent:
        """Generate business report."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        prompt = self.prompts.render_prompt(
            "business_report",
            dataset_name=ds.name,
            kpis=json.dumps([], default=str),
            operational_metrics=json.dumps(context["statistics"], default=str),
            trends="Auto-generated trends",
            benchmarks="N/A",
            action_items="See insights",
        )

        response = await self.gateway.generate(
            prompt=prompt,
            config=GenerationConfig(temperature=0.3, max_tokens=4096),
        )

        return ReportContent(
            title=f"Business Report: {ds.name}",
            content=response.content,
            format="markdown",
            sections=[],
            generated_at=datetime.now(UTC),
        )

    # ==================== DASHBOARD GENERATION ====================

    async def generate_dashboard(
        self,
        dataset_id: UUID,
        user: User,
        business_context: str = "",
        user_roles: list[str] = None,
        key_questions: list[str] = None,
    ) -> DashboardSpec:
        """Generate complete dashboard specification."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        prompt = self.prompts.render_prompt(
            "dashboard_generation",
            dataset_profile=json.dumps(context, default=str),
            business_context=business_context or f"Analysis of {ds.name}",
            user_roles=json.dumps(user_roles or ["analyst", "manager"]),
            key_questions=json.dumps(key_questions or ["What are the key trends?", "What drives performance?"]),
        )

        response = await self.gateway.structured_generate(
            prompt=prompt,
            response_model=dict,
            config=GenerationConfig(temperature=0.3, max_tokens=4096),
        )

        return DashboardSpec(**response[0])

    # ==================== CONVERSATIONAL ANALYSIS ====================

    async def chat_about_dataset(
        self,
        dataset_id: UUID,
        user: User,
        message: str,
        conversation_id: Optional[UUID] = None,
    ) -> dict[str, Any]:
        """Chat with AI about a dataset with memory."""
        ds = await self._get_dataset(dataset_id, user)
        df = load_dataframe(ds.file_path)
        context = self._prepare_dataset_context(df)

        # Get or create conversation
        if conversation_id:
            conv_messages = await self.memory.get_recent_messages(conversation_id, user, count=20)
        else:
            # Create new conversation
            conv = await self.memory.create_conversation(
                dataset_id=dataset_id,
                user=user,
                dataset_context=json.dumps(context, default=str),
            )
            conversation_id = conv.id
            conv_messages = []

        # Build context messages
        messages = []
        if conv_messages:
            for msg in conv_messages:
                messages.append(ChatMessage(
                    role=MessageRole(msg.role),
                    content=msg.content,
                ))

        # Add current message with dataset context
        system_content = f"""You are an AI Data Analyst. The user is asking about a dataset.

Dataset: {ds.name}
Rows: {context['row_count']}
Columns: {context['column_count']}
Key Columns: {', '.join(list(context['columns'].keys())[:10])}

Answer the user's question based on this dataset context. If you need to run analysis, explain what you would do."""
        messages.insert(0, ChatMessage(role=MessageRole.SYSTEM, content=system_content))
        messages.append(ChatMessage(role=MessageRole.USER, content=message))

        # Get AI response
        response = await self.gateway.chat(messages=messages)

        # Store in memory
        await self.memory.add_message(
            conversation_id=conversation_id,
            role=MessageRole.USER,
            content=message,
            user=user,
            model=response.model,
            provider=response.provider.value,
            tokens_prompt=response.usage.get("prompt_tokens", 0),
            tokens_completion=response.usage.get("completion_tokens", 0),
            duration_ms=response.metadata.get("duration_ms", 0),
            dataset_id=dataset_id,
        )

        await self.memory.add_message(
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=response.content,
            user=user,
            model=response.model,
            provider=response.provider.value,
            tokens_prompt=response.usage.get("prompt_tokens", 0),
            tokens_completion=response.usage.get("completion_tokens", 0),
            duration_ms=response.metadata.get("duration_ms", 0),
            dataset_id=dataset_id,
        )

        return {
            "conversation_id": str(conversation_id),
            "response": response.content,
            "model": response.model,
            "provider": response.provider.value,
            "usage": response.usage,
        }


# Global engine instance
_engine: Optional[AIAnalyticsEngine] = None


def get_ai_analytics_engine() -> AIAnalyticsEngine:
    """Get or create the global AI Analytics Engine instance."""
    global _engine
    if _engine is None:
        _engine = AIAnalyticsEngine()
    return _engine
