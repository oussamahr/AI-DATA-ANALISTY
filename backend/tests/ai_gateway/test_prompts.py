"""
Tests for Prompt Library.

Tests prompt templates, rendering, and categorization.
"""

import pytest

from app.services.ai_gateway.prompts.library import (
    PromptLibrary,
    PromptTemplate,
    PromptCategory,
    OutputFormat,
)


class TestPromptLibrary:
    """Test prompt library functionality."""

    def test_library_initialization(self):
        library = PromptLibrary()
        assert len(library._prompts) > 0

        # Check all categories have prompts
        categories = library.get_categories()
        assert len(categories) > 10

    def test_get_prompt(self):
        library = PromptLibrary()

        prompt = library.get_prompt("explain_dataset")
        assert prompt is not None
        assert prompt.id == "explain_dataset"
        assert prompt.category == PromptCategory.DATA_EXPLORATION

    def test_get_nonexistent_prompt(self):
        library = PromptLibrary()
        prompt = library.get_prompt("nonexistent")
        assert prompt is None

    def test_list_prompts_all(self):
        library = PromptLibrary()
        prompts = library.list_prompts()
        assert len(prompts) > 20

    def test_list_prompts_by_category(self):
        library = PromptLibrary()

        sales_prompts = library.list_prompts(category=PromptCategory.SALES_ANALYSIS)
        assert len(sales_prompts) > 0
        assert all(p.category == PromptCategory.SALES_ANALYSIS for p in sales_prompts)

        finance_prompts = library.list_prompts(category=PromptCategory.FINANCE_ANALYSIS)
        assert len(finance_prompts) > 0

    def test_list_prompts_by_tags(self):
        library = PromptLibrary()

        # Search for forecasting prompts
        forecast_prompts = library.list_prompts(tags=["forecasting"])
        # Should find forecast_revenue at least
        assert any("forecast" in p.id for p in forecast_prompts)

    def test_search_prompts(self):
        library = PromptLibrary()

        # Search by name
        results = library.search_prompts("sales")
        assert len(results) > 0
        assert any("sales" in p.name.lower() for p in results)

        # Search by description
        results = library.search_prompts("revenue")
        assert len(results) > 0

        # Search by tag
        results = library.search_prompts("cleaning")
        assert len(results) > 0

    def test_render_prompt(self):
        library = PromptLibrary()

        rendered = library.render_prompt(
            "explain_dataset",
            dataset_profile='{"rows": 100}',
            sample_rows='[{"a": 1}]',
            column_descriptions='{"a": "int"}',
        )

        assert "100" in rendered
        assert "rows" in rendered

    def test_render_prompt_missing_variables(self):
        library = PromptLibrary()

        with pytest.raises(ValueError) as exc_info:
            library.render_prompt("explain_dataset", dataset_profile="test")

        assert "Missing required variables" in str(exc_info.value)
        assert "sample_rows" in str(exc_info.value)

    def test_prompt_template_validation(self):
        library = PromptLibrary()

        prompt = library.get_prompt("sales_analysis")
        missing = prompt.validate_variables(dataset_profile="test")
        assert "sample_data" in missing
        assert "date_column" in missing

    def test_all_prompts_have_required_fields(self):
        library = PromptLibrary()

        for prompt in library._prompts.values():
            assert prompt.id
            assert prompt.name
            assert prompt.description
            assert prompt.category
            assert prompt.template
            assert prompt.output_format
            assert isinstance(prompt.variables, list)
            assert isinstance(prompt.tags, list)
            assert prompt.version


class TestPromptTemplates:
    """Test specific prompt templates."""

    def test_explain_dataset_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("explain_dataset")

        assert prompt.category == PromptCategory.DATA_EXPLORATION
        assert prompt.output_format == OutputFormat.MARKDOWN
        assert "dataset_profile" in prompt.variables
        assert "sample_rows" in prompt.variables
        assert "column_descriptions" in prompt.variables
        assert prompt.system_prompt is not None

    def test_sales_analysis_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("sales_analysis")

        assert prompt.category == PromptCategory.SALES_ANALYSIS
        assert "date_column" in prompt.variables
        assert "revenue_column" in prompt.variables
        assert "product_column" in prompt.variables
        assert "region_column" in prompt.variables

    def test_forecast_revenue_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("forecast_revenue")

        assert prompt.category == PromptCategory.FORECASTING
        assert prompt.output_format == OutputFormat.JSON
        assert "historical_data" in prompt.variables
        assert "forecast_periods" in prompt.variables

    def test_data_cleaning_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("data_cleaning_suggestions")

        assert prompt.category == PromptCategory.DATA_CLEANING
        assert prompt.output_format == OutputFormat.JSON
        assert "column_profiles" in prompt.variables

    def test_chart_recommendation_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("chart_recommendation")

        assert prompt.category == PromptCategory.CHART_RECOMMENDATION
        assert prompt.output_format == OutputFormat.JSON
        assert "analysis_goal" in prompt.variables

    def test_nl_to_sql_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("natural_language_to_sql")

        assert prompt.category == PromptCategory.SQL_GENERATION
        assert prompt.output_format == OutputFormat.SQL
        assert "question" in prompt.variables
        assert "schema" in prompt.variables
        assert "dialect" in prompt.variables

    def test_root_cause_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("root_cause_analysis")

        assert prompt.category == PromptCategory.ROOT_CAUSE_ANALYSIS
        assert prompt.output_format == OutputFormat.JSON
        assert "metric_change" in prompt.variables

    def test_kpi_generation_template(self):
        library = PromptLibrary()
        prompt = library.get_prompt("kpi_generation")

        assert prompt.category == PromptCategory.KPI_GENERATION
        assert prompt.output_format == OutputFormat.JSON
        assert "business_domain" in prompt.variables


class TestPromptCategories:
    """Test all required categories exist."""

    def test_required_categories(self):
        library = PromptLibrary()

        required_categories = [
            PromptCategory.DATA_EXPLORATION,
            PromptCategory.SALES_ANALYSIS,
            PromptCategory.MARKETING_ANALYSIS,
            PromptCategory.FINANCE_ANALYSIS,
            PromptCategory.CUSTOMER_ANALYSIS,
            PromptCategory.RISK_ANALYSIS,
            PromptCategory.INVENTORY_ANALYSIS,
            PromptCategory.FORECASTING,
            PromptCategory.DATA_CLEANING,
            PromptCategory.ANOMALY_DETECTION,
            PromptCategory.CHART_RECOMMENDATION,
            PromptCategory.REPORT_GENERATION,
            PromptCategory.DASHBOARD_GENERATION,
            PromptCategory.SQL_GENERATION,
            PromptCategory.EXECUTIVE_SUMMARY,
            PromptCategory.ROOT_CAUSE_ANALYSIS,
            PromptCategory.KPI_GENERATION,
        ]

        for cat in required_categories:
            prompts = library.list_prompts(category=cat)
            assert len(prompts) > 0, f"No prompts for category {cat}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])