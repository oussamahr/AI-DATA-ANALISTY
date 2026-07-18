"""
Tests for AI Analytics Engine.

Tests smart dataset analysis, data quality, insights, forecasting, etc.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pandas as pd
import numpy as np

from app.services.ai_gateway.analytics.engine import (
    AIAnalyticsEngine,
    DatasetProfile,
    DataQualityReport,
    InsightsReport,
    CleaningPlan,
    ForecastResult,
    AnomalyReport,
    ChartRecommendations,
    SQLQueryResult,
    ReportContent,
    DashboardSpec,
)
from app.services.ai_gateway.providers.base import ChatResponse, GenerationConfig, ProviderType


class TestDatasetContextPreparation:
    """Test dataset context preparation for AI prompts."""

    def test_prepare_context_basic(self):
        engine = AIAnalyticsEngine()
        df = pd.DataFrame({
            "id": [1, 2, 3, 4, 5],
            "name": ["A", "B", "C", "D", "E"],
            "value": [10.5, 20.3, 15.7, 30.1, 25.9],
            "category": ["X", "Y", "X", "Z", "Y"],
        })

        context = engine._prepare_dataset_context(df)

        assert context["row_count"] == 5
        assert context["column_count"] == 4
        assert "id" in context["columns"]
        assert "name" in context["columns"]
        assert "value" in context["columns"]
        assert "category" in context["columns"]
        assert context["numeric_columns"] == ["id", "value"]
        assert context["categorical_columns"] == ["name", "category"]
        assert "correlation_matrix" in context

    def test_prepare_context_with_datetime(self):
        engine = AIAnalyticsEngine()
        df = pd.DataFrame({
            "date": pd.date_range("2024-01-01", periods=5),
            "sales": [100, 150, 120, 180, 200],
        })

        context = engine._prepare_dataset_context(df)

        assert "date" in context["datetime_columns"]
        assert "sales" in context["numeric_columns"]
        assert context["columns"]["date"]["dtype"] == "datetime64[ns]"

    def test_prepare_context_with_nulls(self):
        engine = AIAnalyticsEngine()
        df = pd.DataFrame({
            "a": [1, 2, None, 4, 5],
            "b": [10, None, None, 40, 50],
        })

        context = engine._prepare_dataset_context(df)

        assert context["columns"]["a"]["null_count"] == 1
        assert context["columns"]["b"]["null_count"] == 2
        assert context["columns"]["a"]["null_pct"] == 20.0
        assert context["columns"]["b"]["null_pct"] == 40.0


class TestChartSuggestions:
    """Test chart suggestion generation."""

    def test_generate_chart_suggestions_time_series(self):
        engine = AIAnalyticsEngine()
        context = {
            "numeric_columns": ["sales", "profit"],
            "categorical_columns": ["region", "product"],
            "datetime_columns": ["date"],
            "correlation_matrix": {},
        }

        suggestions = engine._generate_chart_suggestions(context)

        # Should have line charts for time series
        line_charts = [s for s in suggestions if s["chart_type"] == "line"]
        assert len(line_charts) > 0

        # Should have bar charts for categorical vs numeric
        bar_charts = [s for s in suggestions if s["chart_type"] == "bar"]
        assert len(bar_charts) > 0

    def test_generate_chart_suggestions_correlation(self):
        engine = AIAnalyticsEngine()
        context = {
            "numeric_columns": ["a", "b", "c", "d"],
            "categorical_columns": [],
            "datetime_columns": [],
            "correlation_matrix": {
                "a": {"b": 0.8, "c": 0.1},
                "b": {"a": 0.8, "c": 0.2},
                "c": {"a": 0.1, "b": 0.2},
            },
        }

        suggestions = engine._generate_chart_suggestions(context)

        # Should have heatmap for correlations
        heatmaps = [s for s in suggestions if s["chart_type"] == "heatmap"]
        assert len(heatmaps) > 0

        # Should have scatter for highly correlated pairs
        scatters = [s for s in suggestions if s["chart_type"] == "scatter"]
        assert len(scatters) > 0


class TestInsightParsing:
    """Test insight parsing from AI response."""

    def test_parse_insights_correlation(self):
        engine = AIAnalyticsEngine()
        context = {
            "correlation_matrix": {
                "revenue": {"sales": 0.95, "cost": -0.8},
                "sales": {"revenue": 0.95, "cost": 0.3},
                "cost": {"revenue": -0.8, "sales": 0.3},
            },
            "columns": {
                "revenue": {"null_pct": 0},
                "sales": {"null_pct": 0},
                "cost": {"null_pct": 0},
            },
        }

        ai_response = "Analysis complete"
        insights = engine._parse_insights(ai_response, context)

        # Should detect strong correlations
        corr_insights = [i for i in insights if i.type == "correlation"]
        assert len(corr_insights) >= 2

        # Check severity for very high correlation
        high_corr = [i for i in corr_insights if abs(i.details.get("correlation", 0)) > 0.9]
        assert len(high_corr) > 0
        assert high_corr[0].severity == "high"

    def test_parse_insights_missing_values(self):
        engine = AIAnalyticsEngine()
        context = {
            "correlation_matrix": {},
            "columns": {
                "col1": {"null_pct": 60},
                "col2": {"null_pct": 25},
                "col3": {"null_pct": 5},
            },
        }

        insights = engine._parse_insights("", context)

        # Should detect high missing values
        high_missing = [i for i in insights if i.type == "data_quality" and i.severity == "high"]
        assert len(high_missing) == 1
        assert high_missing[0].details["column"] == "col1"

        # Should detect moderate missing values
        med_missing = [i for i in insights if i.type == "data_quality" and i.severity == "medium"]
        assert len(med_missing) == 1
        assert med_missing[0].details["column"] == "col2"

    def test_parse_insights_potential_id(self):
        engine = AIAnalyticsEngine()
        context = {
            "correlation_matrix": {},
            "columns": {
                "id": {"unique_pct": 100, "dtype": "int64"},
                "name": {"unique_pct": 80, "dtype": "object"},
                "value": {"unique_pct": 50, "dtype": "float64"},
            },
        }

        insights = engine._parse_insights("", context)

        id_insights = [i for i in insights if "identifier" in i.title.lower()]
        assert len(id_insights) == 1
        assert id_insights[0].details["column"] == "id"


class TestSQLSafetyValidation:
    """Test SQL safety validation."""

    def test_validate_safe_select(self):
        engine = AIAnalyticsEngine()
        sql = "SELECT * FROM users WHERE active = true LIMIT 100"
        assert engine._validate_sql_safety(sql) is True

    def test_validate_safe_with(self):
        engine = AIAnalyticsEngine()
        sql = "WITH cte AS (SELECT * FROM users) SELECT * FROM cte"
        assert engine._validate_sql_safety(sql) is True

    def test_reject_delete(self):
        engine = AIAnalyticsEngine()
        sql = "DELETE FROM users WHERE id = 1"
        assert engine._validate_sql_safety(sql) is False

    def test_reject_update(self):
        engine = AIAnalyticsEngine()
        sql = "UPDATE users SET name = 'test' WHERE id = 1"
        assert engine._validate_sql_safety(sql) is False

    def test_reject_drop(self):
        engine = AIAnalyticsEngine()
        sql = "DROP TABLE users"
        assert engine._validate_sql_safety(sql) is False

    def test_reject_alter(self):
        engine = AIAnalyticsEngine()
        sql = "ALTER TABLE users ADD COLUMN test VARCHAR(50)"
        assert engine._validate_sql_safety(sql) is False

    def test_reject_truncate(self):
        engine = AIAnalyticsEngine()
        sql = "TRUNCATE TABLE users"
        assert engine._validate_sql_safety(sql) is False

    def test_reject_insert(self):
        engine = AIAnalyticsEngine()
        sql = "INSERT INTO users (name) VALUES ('test')"
        assert engine._validate_sql_safety(sql) is False

    def test_case_insensitive(self):
        engine = AIAnalyticsEngine()
        sql = "delete from users"
        assert engine._validate_sql_safety(sql) is False


class TestMockedEngineCalls:
    """Test engine methods with mocked gateway."""

    @pytest.mark.asyncio
    async def test_forecast_calls_gateway(self):
        engine = AIAnalyticsEngine()
        engine.gateway = AsyncMock()

        # Mock structured_generate response - returns tuple of (dict, response_obj)
        forecast_data = {
            "model_used": "TestModel",
            "forecast": [{"date": "2024-02-01", "predicted": 100, "lower_bound": 90, "upper_bound": 110}],
            "accuracy_metrics": {"mae": 5.0, "mape": 0.05, "rmse": 7.0},
            "trend": "increasing",
            "seasonality_detected": True,
            "key_assumptions": ["Linear trend continues"],
            "risks": ["Seasonal variation"],
        }

        engine.gateway.structured_generate = AsyncMock(return_value=(forecast_data, MagicMock()))

        # Need to mock _get_dataset and _load_dataframe
        with patch("app.services.ai_gateway.analytics.engine._load_dataframe") as mock_load:
            mock_df = pd.DataFrame({
                "date": pd.date_range("2024-01-01", periods=10),
                "value": range(10),
            })
            mock_load.return_value = mock_df

            with patch.object(engine, "_get_dataset") as mock_get_ds:
                mock_ds = MagicMock()
                mock_ds.name = "test_dataset"
                mock_get_ds.return_value = mock_ds

                result = await engine.forecast(
                    dataset_id=uuid4(),
                    user=MagicMock(),
                    date_column="date",
                    value_column="value",
                )

                assert isinstance(result, ForecastResult)
                assert result.model == "TestModel"
                assert result.trend == "increasing"

    @pytest.mark.asyncio
    async def test_natural_language_to_sql(self):
        engine = AIAnalyticsEngine()
        engine.gateway = AsyncMock()

        mock_response = MagicMock()
        mock_response.content = "SELECT * FROM sales WHERE date > '2024-01-01' LIMIT 100"
        engine.gateway.generate = AsyncMock(return_value=mock_response)

        with patch("app.services.ai_gateway.analytics.engine._load_dataframe") as mock_load:
            mock_df = pd.DataFrame({
                "date": pd.date_range("2024-01-01", periods=10),
                "sales": range(10),
            })
            mock_load.return_value = mock_df

            with patch.object(engine, "_get_dataset") as mock_get_ds:
                mock_ds = MagicMock()
                mock_ds.name = "test_dataset"
                mock_get_ds.return_value = mock_ds

                result = await engine.natural_language_to_sql(
                    dataset_id=uuid4(),
                    user=MagicMock(),
                    question="Show me sales from January 2024",
                )

                assert isinstance(result, SQLQueryResult)
                assert result.is_safe is True
                assert "SELECT" in result.sql


if __name__ == "__main__":
    pytest.main([__file__, "-v"])