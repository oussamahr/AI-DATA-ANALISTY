"""
Prompt Library - Built-in prompts for AI Data Analyst.

Contains curated, tested prompts for various analytics domains and tasks.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional
from uuid import UUID


class PromptCategory(str, Enum):
    """Prompt categories."""

    DATA_EXPLORATION = "data_exploration"
    SALES_ANALYSIS = "sales_analysis"
    MARKETING_ANALYSIS = "marketing_analysis"
    FINANCE_ANALYSIS = "finance_analysis"
    CUSTOMER_ANALYSIS = "customer_analysis"
    RISK_ANALYSIS = "risk_analysis"
    INVENTORY_ANALYSIS = "inventory_analysis"
    FORECASTING = "forecasting"
    DATA_CLEANING = "data_cleaning"
    ANOMALY_DETECTION = "anomaly_detection"
    CHART_RECOMMENDATION = "chart_recommendation"
    REPORT_GENERATION = "report_generation"
    DASHBOARD_GENERATION = "dashboard_generation"
    SQL_GENERATION = "sql_generation"
    EXECUTIVE_SUMMARY = "executive_summary"
    ROOT_CAUSE_ANALYSIS = "root_cause_analysis"
    KPI_GENERATION = "kpi_generation"


class OutputFormat(str, Enum):
    """Expected output format."""

    TEXT = "text"
    JSON = "json"
    MARKDOWN = "markdown"
    SQL = "sql"
    PYTHON = "python"
    CHART_CONFIG = "chart_config"


@dataclass
class PromptTemplate:
    """A prompt template with metadata."""

    id: str
    name: str
    description: str
    category: PromptCategory
    template: str
    variables: list[str] = field(default_factory=list)
    output_format: OutputFormat = OutputFormat.TEXT
    system_prompt: Optional[str] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    version: str = "1.0.0"

    def render(self, **kwargs) -> str:
        """Render the template with variables."""
        return self.template.format(**kwargs)

    def validate_variables(self, **kwargs) -> list[str]:
        """Validate required variables are provided."""
        missing = [v for v in self.variables if v not in kwargs]
        return missing


class PromptLibrary:
    """
    Library of built-in prompts for AI Data Analyst.

    Provides categorized, versioned prompts for common analytics tasks.
    """

    def __init__(self):
        self._prompts: dict[str, PromptTemplate] = {}
        self._initialize_prompts()

    def _initialize_prompts(self) -> None:
        """Initialize all built-in prompts."""

        # ==================== DATA EXPLORATION ====================

        self._add_prompt(
            PromptTemplate(
                id="explain_dataset",
                name="Explain Dataset",
                description="Get a comprehensive overview of a dataset including structure, key columns, and initial insights",
                category=PromptCategory.DATA_EXPLORATION,
                variables=["dataset_profile", "sample_rows", "column_descriptions"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are an expert data analyst. Provide clear, actionable insights about datasets.",
                template="""Analyze this dataset and provide a comprehensive overview.

## Dataset Profile
{dataset_profile}

## Sample Data (first 10 rows)
{sample_rows}

## Column Descriptions
{column_descriptions}

Please provide:
1. **Dataset Summary** - 2-3 sentences describing what this dataset contains
2. **Key Columns** - Identify the most important columns (IDs, dates, measures, dimensions)
3. **Data Quality Observations** - Missing values, outliers, inconsistencies
4. **Initial Insights** - 3-5 interesting patterns or observations
5. **Suggested Analyses** - What analyses would be most valuable for this dataset
6. **Recommended Visualizations** - Chart types that would work well""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="find_trends",
                name="Find Trends",
                description="Identify trends, patterns, and seasonality in time-series data",
                category=PromptCategory.DATA_EXPLORATION,
                variables=["dataset_profile", "time_column", "measure_columns", "sample_data"],
                output_format=OutputFormat.JSON,
                system_prompt="You are an expert at time-series analysis. Identify trends, seasonality, and anomalies.",
                template="""Analyze this time-series data for trends and patterns.

## Time Column
{time_column}

## Measure Columns
{measure_columns}

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

Return a JSON object with:
{
  "trends": [
    {"column": "column_name", "direction": "increasing|decreasing|stable", "strength": "strong|moderate|weak", "description": "..."}
  ],
  "seasonality": [
    {"column": "column_name", "period": "daily|weekly|monthly|yearly", "description": "..."}
  ],
  "anomalies": [
    {"column": "column_name", "timestamp": "...", "value": ..., "expected_range": [...], "description": "..."}
  ],
  "correlations_over_time": [
    {"column_1": "...", "column_2": "...", "correlation": 0.0, "description": "..."}
  ]
}""",
            )
        )

        # ==================== SALES ANALYSIS ====================

        self._add_prompt(
            PromptTemplate(
                id="sales_analysis",
                name="Sales Analysis",
                description="Comprehensive sales performance analysis with revenue trends, top products, and regional breakdown",
                category=PromptCategory.SALES_ANALYSIS,
                variables=["dataset_profile", "sample_data", "date_column", "revenue_column", "product_column", "region_column"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a sales analytics expert. Provide actionable insights for sales teams and leadership.",
                template="""Perform a comprehensive sales analysis on this dataset.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Key Columns
- Date: {date_column}
- Revenue: {revenue_column}
- Product: {product_column}
- Region: {region_column}

Provide analysis in these sections:

### 1. Revenue Overview
- Total revenue, average order value, revenue growth rate
- Revenue trend over time (increasing/decreasing/seasonal)

### 2. Top Performers
- Top 10 products by revenue
- Top 10 products by growth rate
- Top regions/territories

### 3. Sales Patterns
- Seasonality (monthly, quarterly, yearly)
- Day-of-week patterns
- Product category performance

### 4. Customer Segments (if customer data available)
- High-value customers
- Repeat purchase rate
- Customer lifetime value indicators

### 5. Actionable Recommendations
- 3-5 specific, prioritized recommendations
- Quick wins vs strategic initiatives

### 6. Risk Factors
- Declining products/regions
- Concentration risks
- Seasonal dependencies""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="forecast_revenue",
                name="Forecast Revenue",
                description="Generate revenue forecasts using time-series analysis",
                category=PromptCategory.FORECASTING,
                variables=["historical_data", "date_column", "revenue_column", "forecast_periods", "confidence_level"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a forecasting expert. Provide realistic forecasts with confidence intervals.",
                tags=["forecasting", "time-series", "revenue"],
                template="""Generate a revenue forecast based on historical data.

## Historical Data
{historical_data}

## Configuration
- Date Column: {date_column}
- Revenue Column: {revenue_column}
- Forecast Periods: {forecast_periods}
- Confidence Level: {confidence_level}

Return JSON with:
{{
  "forecast": [
    {{"date": "...", "predicted": 0.0, "lower_bound": 0.0, "upper_bound": 0.0}}
  ],
  "model_used": "ARIMA|Prophet|ETS|Linear",
  "accuracy_metrics": {{"mae": 0.0, "mape": 0.0, "rmse": 0.0}},
  "trend": "increasing|decreasing|stable",
  "seasonality_detected": true,
  "key_assumptions": [...],
  "risks": [...]
}}""",
            )
        )

        # ==================== MARKETING ANALYSIS ====================

        self._add_prompt(
            PromptTemplate(
                id="marketing_analysis",
                name="Marketing Analysis",
                description="Analyze marketing campaign performance, channel effectiveness, and ROI",
                category=PromptCategory.MARKETING_ANALYSIS,
                variables=["dataset_profile", "sample_data", "campaign_column", "channel_column", "spend_column", "conversion_column", "revenue_column"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a marketing analytics expert. Focus on ROI, channel attribution, and optimization opportunities.",
                template="""Analyze marketing campaign performance.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Key Columns
- Campaign: {campaign_column}
- Channel: {channel_column}
- Spend: {spend_column}
- Conversions: {conversion_column}
- Revenue: {revenue_column}

Provide:

### 1. Channel Performance
- ROI by channel (Revenue/Spend)
- Cost per acquisition (CPA) by channel
- Conversion rates by channel

### 2. Campaign Effectiveness
- Top/Bottom performing campaigns
- Campaign efficiency trends

### 3. Attribution Insights
- Channel contribution to conversions
- Assisted conversions
- Multi-touch patterns (if data allows)

### 4. Budget Optimization
- Recommended budget reallocation
- Diminishing returns detection
- Test opportunities

### 5. Recommendations
- 3-5 specific actions with expected impact""",
            )
        )

        # ==================== FINANCE ANALYSIS ====================

        self._add_prompt(
            PromptTemplate(
                id="finance_analysis",
                name="Financial Analysis",
                description="Analyze financial statements, P&L, cash flow, and key financial ratios",
                category=PromptCategory.FINANCE_ANALYSIS,
                variables=["dataset_profile", "sample_data", "date_column", "account_column", "amount_column", "category_column"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a financial analyst. Provide insights on profitability, liquidity, and financial health.",
                template="""Perform financial analysis on this dataset.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Key Columns
- Date: {date_column}
- Account: {account_column}
- Amount: {amount_column}
- Category: {category_column}

Provide analysis:

### 1. Profitability Analysis
- Revenue trends
- Gross margin, operating margin, net margin
- Expense breakdown and trends

### 2. Liquidity & Solvency
- Cash flow patterns
- Current ratio, quick ratio trends
- Debt levels and coverage

### 3. Efficiency Ratios
- Asset turnover
- Inventory turnover (if applicable)
- Receivables/payables turnover

### 4. Variance Analysis
- Budget vs actual (if budget data available)
- Year-over-year comparisons
- Significant variances with explanations

### 5. Red Flags & Opportunities
- Concerning trends
- Improvement opportunities
- Risk factors""",
            )
        )

        # ==================== CUSTOMER ANALYSIS ====================

        self._add_prompt(
            PromptTemplate(
                id="customer_analysis",
                name="Customer Analysis",
                description="Analyze customer behavior, segmentation, lifetime value, and churn signals",
                category=PromptCategory.CUSTOMER_ANALYSIS,
                variables=["dataset_profile", "sample_data", "customer_id_column", "date_column", "revenue_column", "segment_column"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a customer analytics expert. Focus on segmentation, LTV, and retention.",
                template="""Analyze customer behavior and segmentation.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Key Columns
- Customer ID: {customer_id_column}
- Date: {date_column}
- Revenue: {revenue_column}
- Segment: {segment_column}

Provide:

### 1. Customer Segmentation
- RFM analysis (Recency, Frequency, Monetary)
- Segment profiles and sizes
- High-value vs at-risk customers

### 2. Lifetime Value
- Estimated LTV by segment
- Payback period
- Retention curves

### 3. Churn Analysis
- Churn rate by segment
- Leading indicators of churn
- Win-back opportunities

### 4. Behavioral Patterns
- Purchase frequency
- Average order value trends
- Product affinity / cross-sell

### 5. Actionable Recommendations
- Retention campaigns
- Upsell/cross-sell opportunities
- Segment-specific strategies""",
            )
        )

        # ==================== RISK ANALYSIS ====================

        self._add_prompt(
            PromptTemplate(
                id="risk_analysis",
                name="Risk Analysis",
                description="Identify business risks, anomalies, fraud signals, and compliance issues",
                category=PromptCategory.RISK_ANALYSIS,
                variables=["dataset_profile", "sample_data", "risk_factors", "threshold_config"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a risk analyst. Identify anomalies, fraud patterns, and compliance risks.",
                template="""Perform risk analysis on this dataset.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Risk Factors to Check
{risk_factors}

## Threshold Configuration
{threshold_config}

Return JSON with:
{{
  "anomalies": [
    {{"type": "statistical|behavioral|transactional", "severity": "high|medium|low", "description": "...", "affected_records": [...], "recommendation": "..."}}
  ],
  "fraud_signals": [
    {{"pattern": "...", "confidence": 0.0, "description": "...", "investigation_priority": "high|medium|low"}}
  ],
  "compliance_risks": [
    {{"regulation": "...", "risk_level": "...", "description": "...", "remediation": "..."}}
  ],
  "operational_risks": [
    {{"area": "...", "risk": "...", "impact": "...", "likelihood": "...", "mitigation": "..."}}
  ],
  "summary": "Overall risk assessment"
}}""",
            )
        )

        # ==================== INVENTORY ANALYSIS ====================

        self._add_prompt(
            PromptTemplate(
                id="inventory_analysis",
                name="Inventory Analysis",
                description="Analyze inventory levels, turnover, stockouts, and reorder optimization",
                category=PromptCategory.INVENTORY_ANALYSIS,
                variables=["dataset_profile", "sample_data", "product_column", "quantity_column", "reorder_point_column", "lead_time_column", "demand_column"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a supply chain analyst. Focus on inventory optimization and stockout prevention.",
                template="""Analyze inventory performance and optimization opportunities.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Key Columns
- Product: {product_column}
- Current Quantity: {quantity_column}
- Reorder Point: {reorder_point_column}
- Lead Time: {lead_time_column}
- Demand: {demand_column}

Provide:

### 1. Inventory Health
- Stockout risk by product
- Overstock identification
- Inventory turnover rates

### 2. Reorder Optimization
- Optimal reorder points
- Safety stock calculations
- Economic order quantities

### 3. Demand Patterns
- Demand variability
- Seasonality effects
- Lead time demand

### 4. Cost Analysis
- Carrying costs
- Stockout costs
- Total inventory cost

### 5. Recommendations
- Immediate reorder items
- Slow-moving inventory actions
- Process improvements""",
            )
        )

        # ==================== DATA CLEANING ====================

        self._add_prompt(
            PromptTemplate(
                id="data_cleaning_suggestions",
                name="Data Cleaning Suggestions",
                description="Identify data quality issues and suggest cleaning actions",
                category=PromptCategory.DATA_CLEANING,
                variables=["dataset_profile", "column_profiles", "sample_data"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a data quality expert. Identify issues and provide executable cleaning steps.",
                template="""Analyze data quality and suggest cleaning actions.

## Dataset Profile
{dataset_profile}

## Column Profiles
{column_profiles}

## Sample Data
{sample_data}

Return JSON with:
{{
  "quality_score": 0.0,
  "issues": [
    {{
      "type": "missing_values|duplicates|outliers|format_inconsistency|type_mismatch|pii_exposure",
      "column": "column_name",
      "severity": "high|medium|low",
      "count": 0,
      "percentage": 0.0,
      "description": "...",
      "suggested_action": "drop|fill_mean|fill_median|fill_mode|fill_constant|remove_duplicates|cap_outliers|convert_type|standardize_format",
      "action_params": {{}}
    }}
  ],
  "duplicates": {{"count": 0, "columns_checked": [], "action": "keep_first|keep_last|drop_all"}},
  "missing_values_summary": {{"total": 0, "by_column": {{}}}},
  "outliers_summary": {{"total": 0, "by_column": {{}}}},
  "format_issues": [],
  "pii_columns": []
}}""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="one_click_cleaning_plan",
                name="One-Click Cleaning Plan",
                description="Generate an executable cleaning plan with specific operations",
                category=PromptCategory.DATA_CLEANING,
                variables=["issues_json", "dataset_profile"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a data engineer. Create executable cleaning pipelines.",
                template="""Generate an executable data cleaning plan.

## Identified Issues
{issues_json}

## Dataset Profile
{dataset_profile}

Return JSON with executable steps:
{{
  "steps": [
    {{
      "step": 1,
      "operation": "drop_duplicates|fill_missing|convert_type|standardize_format|remove_outliers|trim_whitespace|normalize_case",
      "column": "column_name",
      "parameters": {{}},
      "description": "...",
      "reversible": true,
      "estimated_rows_affected": 0
    }}
  ],
  "execution_order": [1, 2, 3],
  "rollback_plan": "Description of how to undo changes",
  "validation_queries": ["SQL or pandas code to verify results"]
}}""",
            )
        )

        # ==================== ANOMALY DETECTION ====================

        self._add_prompt(
            PromptTemplate(
                id="anomaly_detection",
                name="Anomaly Detection",
                description="Detect anomalies, outliers, and unusual patterns with explanations",
                category=PromptCategory.ANOMALY_DETECTION,
                variables=["dataset_profile", "sample_data", "numeric_columns", "categorical_columns", "time_column"],
                output_format=OutputFormat.JSON,
                system_prompt="You are an anomaly detection expert. Use statistical and ML methods to find anomalies.",
                template="""Detect anomalies in this dataset.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Columns
- Numeric: {numeric_columns}
- Categorical: {categorical_columns}
- Time: {time_column}

Return JSON with:
{{
  "point_anomalies": [
    {{"row_index": 0, "column": "...", "value": 0.0, "expected_range": [0.0, 0.0], "method": "z_score|iqr|isolation_forest", "severity": "high|medium|low", "explanation": "..."}}
  ],
  "contextual_anomalies": [
    {{"row_index": 0, "context": {{}}, "anomaly_score": 0.0, "description": "...", "explanation": "..."}}
  ],
  "collective_anomalies": [
    {{"start_index": 0, "end_index": 0, "pattern": "...", "description": "...", "explanation": "..."}}
  ],
  "fraud_indicators": [
    {{"pattern": "...", "confidence": 0.0, "affected_rows": [], "description": "..."}}
  ],
  "summary": {{"total_anomalies": 0, "by_type": {{}}, "recommended_actions": []}}
}}""",
            )
        )

        # ==================== CHART RECOMMENDATION ====================

        self._add_prompt(
            PromptTemplate(
                id="chart_recommendation",
                name="Chart Recommendation",
                description="Recommend optimal visualizations for data with explanations",
                category=PromptCategory.CHART_RECOMMENDATION,
                variables=["dataset_profile", "column_profiles", "analysis_goal", "audience"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a data visualization expert. Recommend charts based on data types and analysis goals.",
                template="""Recommend optimal visualizations for this dataset.

## Dataset Profile
{dataset_profile}

## Column Profiles
{column_profiles}

## Analysis Goal
{analysis_goal}

## Target Audience
{audience}

Return JSON with:
{{
  "recommendations": [
    {{
      "chart_type": "line|bar|area|scatter|pie|donut|heatmap|treemap|box|violin|histogram|waterfall|funnel|sankey",
      "title": "...",
      "description": "...",
      "x_column": "...",
      "y_columns": [...],
      "color_column": "...",
      "facet_column": "...",
      "reason": "Why this chart is appropriate",
      "priority": 1,
      "config": {{}}
    }}
  ],
  "dashboard_layout": [
    {{"row": 1, "col": 1, "chart_id": 0, "width": 6, "height": 4}}
  ],
  "color_scheme": "categorical|sequential|diverging",
  "accessibility_notes": []
}}""",
            )
        )

        # ==================== REPORT GENERATION ====================

        self._add_prompt(
            PromptTemplate(
                id="executive_report",
                name="Executive Report",
                description="Generate executive summary report with key findings and recommendations",
                category=PromptCategory.REPORT_GENERATION,
                variables=["dataset_name", "analysis_results", "key_metrics", "insights", "recommendations", "time_period"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a business analyst writing for C-suite executives. Be concise, action-oriented, and strategic.",
                template="""Generate an executive report.

## Dataset
{dataset_name}

## Time Period
{time_period}

## Key Metrics
{key_metrics}

## Analysis Results
{analysis_results}

## Key Insights
{insights}

## Recommendations
{recommendations}

Create a report with:

# Executive Summary: {dataset_name} Analysis

## Key Findings
- 3-5 bullet points with the most critical findings

## Performance Highlights
- Metric | Current | Previous | Change | Trend

## Strategic Insights
- Business implications of findings
- Market/context factors

## Recommendations
### Immediate (0-30 days)
- Action items with owners

### Short-term (30-90 days)
- Initiatives with expected impact

### Strategic (90+ days)
- Transformational opportunities

## Risks & Mitigations
- Key risks identified
- Mitigation strategies

## Appendix
- Methodology
- Data sources
- Assumptions""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="technical_report",
                name="Technical Report",
                description="Generate detailed technical report with methodology and code",
                category=PromptCategory.REPORT_GENERATION,
                variables=["dataset_name", "analysis_methodology", "data_quality", "statistical_results", "model_details", "code_snippets"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a data scientist writing a technical report. Include methodology, assumptions, and reproducible details.",
                template="""Generate a technical report.

## Dataset
{dataset_name}

## Methodology
{analysis_methodology}

## Data Quality Assessment
{data_quality}

## Statistical Results
{statistical_results}

## Model Details
{model_details}

## Code Snippets
{code_snippets}

Create a technical report with:

# Technical Report: {dataset_name}

## 1. Introduction
- Objective
- Scope
- Data sources

## 2. Data Preparation
- Cleaning steps
- Feature engineering
- Train/test split (if applicable)

## 3. Methodology
- Statistical tests used
- Models/algorithms
- Hyperparameters
- Validation approach

## 4. Results
- Detailed findings
- Statistical significance
- Confidence intervals
- Visualizations (described)

## 5. Model Performance (if applicable)
- Metrics
- Feature importance
- Residual analysis
- Limitations

## 6. Reproducibility
- Code references
- Environment
- Data version

## 7. Conclusions & Next Steps""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="business_report",
                name="Business Report",
                description="Generate business-focused report with KPIs and operational insights",
                category=PromptCategory.REPORT_GENERATION,
                variables=["dataset_name", "kpis", "operational_metrics", "trends", "benchmarks", "action_items"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a business analyst writing for operational managers. Focus on KPIs, benchmarks, and daily operations.",
                template="""Generate a business operations report.

## Dataset
{dataset_name}

## KPIs
{kpis}

## Operational Metrics
{operational_metrics}

## Trends
{trends}

## Benchmarks
{benchmarks}

## Action Items
{action_items}

Create a business report with:

# Business Report: {dataset_name}

## KPI Dashboard
| KPI | Current | Target | Status | Trend |
|-----|---------|--------|--------|-------|

## Operational Performance
- Department/Team breakdown
- Efficiency metrics
- Quality metrics

## Trend Analysis
- Week-over-week
- Month-over-month
- Year-over-year

## Benchmark Comparison
- Internal benchmarks
- Industry benchmarks (if available)

## Action Items
| Priority | Action | Owner | Due Date | Expected Impact |
|----------|--------|-------|----------|-----------------|

## Notes & Assumptions""",
            )
        )

        # ==================== DASHBOARD GENERATION ====================

        self._add_prompt(
            PromptTemplate(
                id="dashboard_generation",
                name="Dashboard Generation",
                description="Generate complete dashboard specification with KPIs, charts, filters, and layout",
                category=PromptCategory.DASHBOARD_GENERATION,
                variables=["dataset_profile", "business_context", "user_roles", "key_questions"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a BI dashboard designer. Create comprehensive, user-friendly dashboard specs.",
                template="""Generate a dashboard specification.

## Dataset Profile
{dataset_profile}

## Business Context
{business_context}

## User Roles
{user_roles}

## Key Questions to Answer
{key_questions}

Return JSON with:
{{
  "dashboard": {{
    "title": "...",
    "description": "...",
    "refresh_interval": "real_time|hourly|daily|weekly",
    "theme": "light|dark|auto"
  }},
  "kpis": [
    {{
      "id": "kpi_1",
      "title": "...",
      "metric": "...",
      "aggregation": "sum|avg|count|min|max|rate",
      "format": "number|currency|percentage|duration",
      "target": 0.0,
      "thresholds": {{"warning": 0.0, "critical": 0.0}},
      "trend_period": "daily|weekly|monthly"
    }}
  ],
  "charts": [
    {{
      "id": "chart_1",
      "type": "line|bar|area|scatter|pie|heatmap|table|gauge",
      "title": "...",
      "x_axis": "...",
      "y_axis": [...],
      "filters": [...],
      "drill_down": true,
      "position": {{"x": 0, "y": 0, "w": 6, "h": 4}}
    }}
  ],
  "filters": [
    {{
      "id": "filter_1",
      "column": "...",
      "type": "dropdown|multiselect|date_range|slider|search",
      "default": "...",
      "affects": ["chart_1", "chart_2", "kpi_1"]
    }}
  ],
  "tabs": [
    {{"id": "overview", "title": "Overview", "charts": ["chart_1", "chart_2"], "kpis": ["kpi_1"]}}
  ],
  "insights_panel": true,
  "export_enabled": true
}}""",
            )
        )

        # ==================== SQL GENERATION ====================

        self._add_prompt(
            PromptTemplate(
                id="natural_language_to_sql",
                name="Natural Language to SQL",
                description="Convert natural language questions to safe, read-only SQL",
                category=PromptCategory.SQL_GENERATION,
                variables=["question", "schema", "sample_data", "dialect"],
                output_format=OutputFormat.SQL,
                system_prompt="You are a SQL expert. Generate safe, read-only SELECT queries. Never use DELETE, UPDATE, DROP, ALTER, TRUNCATE.",
                template="""Convert this question to SQL.

## Question
{question}

## Database Schema
{schema}

## Sample Data
{sample_data}

## SQL Dialect
{dialect}

Generate a SELECT query that:
1. Answers the question accurately
2. Uses only read operations (SELECT, WITH, JOIN)
3. Includes appropriate WHERE clauses for filtering
4. Uses LIMIT for safety (max 10000 rows)
5. Handles NULLs appropriately
6. Uses explicit column names (no SELECT *)
7. Includes comments explaining the logic

Return ONLY the SQL query with comments. No markdown, no explanation.""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="explain_sql",
                name="Explain SQL",
                description="Explain what a SQL query does in plain language",
                category=PromptCategory.SQL_GENERATION,
                variables=["sql_query", "schema"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a SQL educator. Explain queries clearly for non-technical stakeholders.",
                template="""Explain this SQL query in plain language.

## SQL Query
```sql
{sql_query}
```

## Schema Context
{schema}

Provide:
1. **One-sentence summary** of what the query returns
2. **Step-by-step breakdown** of each clause
3. **Key business questions** this query answers
4. **Potential performance considerations**
5. **Assumptions and limitations**""",
            )
        )

        # ==================== ROOT CAUSE ANALYSIS ====================

        self._add_prompt(
            PromptTemplate(
                id="root_cause_analysis",
                name="Root Cause Analysis",
                description="Perform structured root cause analysis on metric changes",
                category=PromptCategory.ROOT_CAUSE_ANALYSIS,
                variables=["metric_change", "dataset_profile", "dimension_columns", "time_period", "related_metrics"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a root cause analyst. Use structured problem-solving (5 Whys, Fishbone, Pareto).",
                template="""Perform root cause analysis on this metric change.

## Metric Change
{metric_change}

## Dataset Profile
{dataset_profile}

## Dimension Columns (for drill-down)
{dimension_columns}

## Time Period
{time_period}

## Related Metrics
{related_metrics}

Return JSON with:
{{
  "problem_statement": "...",
  "magnitude": {{"current": 0.0, "previous": 0.0, "change_pct": 0.0}},
  "timeline": "When did the change start?",
  "pareto_analysis": [
    {{"dimension": "...", "value": "...", "contribution_pct": 0.0, "impact": "positive|negative"}}
  ],
  "hypotheses": [
    {{"hypothesis": "...", "evidence_for": [...], "evidence_against": [...], "confidence": 0.0, "status": "confirmed|rejected|investigating"}}
  ],
  "root_causes": [
    {{"cause": "...", "category": "data|process|external|system|people", "evidence": "...", "confidence": 0.0}}
  ],
  "recommended_actions": [
    {{"action": "...", "priority": "high|medium|low", "effort": "low|medium|high", "owner": "...", "timeline": "..."}}
  ],
  "monitoring_plan": "How to verify fix and prevent recurrence"
}}""",
            )
        )

        # ==================== KPI GENERATION ====================

        self._add_prompt(
            PromptTemplate(
                id="kpi_generation",
                name="KPI Generation",
                description="Generate relevant KPIs for a dataset based on business context",
                category=PromptCategory.KPI_GENERATION,
                variables=["dataset_profile", "business_domain", "business_goals", "available_columns"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a KPI designer. Create SMART KPIs aligned with business objectives.",
                template="""Generate relevant KPIs for this dataset.

## Dataset Profile
{dataset_profile}

## Business Domain
{business_domain}

## Business Goals
{business_goals}

## Available Columns
{available_columns}

Return JSON with:
{{
  "kpis": [
    {{
      "id": "kpi_1",
      "name": "...",
      "description": "...",
      "formula": "...",
      "unit": "...",
      "frequency": "real_time|daily|weekly|monthly|quarterly",
      "target": 0.0,
      "benchmark": 0.0,
      "direction": "higher_is_better|lower_is_better|target_is_best",
      "category": "financial|operational|customer|employee|quality",
      "leading_lagging": "leading|lagging",
      "data_source": "...",
      "calculation_logic": "...",
      "owner": "..."
    }}
  ],
  "kpi_tree": {{
    "north_star": "kpi_1",
    "drivers": ["kpi_2", "kpi_3"],
    "sub_drivers": {{"kpi_2": ["kpi_4", "kpi_5"]}}
  },
  "dashboard_layout_suggestion": [...]
}}""",
            )
        )

        # EXECUTIVE SUMMARY
        self._add_prompt(
            PromptTemplate(
                id="executive_summary",
                name="Executive Summary",
                description="Generate concise executive summary from analysis results",
                category=PromptCategory.EXECUTIVE_SUMMARY,
                variables=["dataset_name", "key_findings", "metrics", "recommendations", "time_period"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a business analyst writing for C-suite executives. Be concise, action-oriented, and strategic.",
                template="""Generate an executive summary.

## Dataset
{dataset_name}

## Time Period
{time_period}

## Key Findings
{key_findings}

## Key Metrics
{metrics}

## Recommendations
{recommendations}

Create an executive summary with:

# Executive Summary: {dataset_name}

## Overview
2-3 sentences summarizing the most critical findings.

## Key Metrics
| Metric | Current | Previous | Change | Trend |
|--------|---------|----------|--------|-------|

## Strategic Implications
- Business impact of findings
- Market/context factors

## Recommendations
### Immediate (0-30 days)
- Action items with owners

### Short-term (30-90 days)
- Initiatives with expected impact

### Strategic (90+ days)
- Transformational opportunities

## Risks & Mitigations
- Key risks identified
- Mitigation strategies""",
            )
        )

        # ==================== PYTHON CODE GENERATION ====================

        self._add_prompt(
            PromptTemplate(
                id="python_code_generation",
                name="Python Code Generation",
                description="Generate Python code for data analysis, visualization, and modeling",
                category=PromptCategory.DATA_EXPLORATION,
                variables=["dataset_profile", "task_description", "available_columns", "libraries"],
                output_format=OutputFormat.PYTHON,
                system_prompt="You are a Python data science expert. Generate clean, executable, well-documented code using pandas, numpy, matplotlib, seaborn, plotly, scikit-learn, statsmodels, and prophet.",
                template="""Generate Python code for this data analysis task.

## Dataset Profile
{dataset_profile}

## Task Description
{task_description}

## Available Columns
{available_columns}

## Preferred Libraries
{libraries}

Generate a complete Python script that:
1. Loads the dataset (assume CSV path provided as variable)
2. Performs the requested analysis
3. Creates visualizations where appropriate
4. Outputs results clearly
5. Includes error handling and comments

Return ONLY the Python code. No markdown, no explanation.
Use this template structure:

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
# Add other imports as needed

# Load data
df = pd.read_csv('dataset_path.csv')  # Path will be provided at runtime

# Your analysis code here
```

Best practices:
- Use vectorized operations
- Handle missing values appropriately
- Add docstrings for functions
- Include type hints where helpful
- Save plots to files, don't just show()
""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="python_analysis_pipeline",
                name="Python Analysis Pipeline",
                description="Generate a complete end-to-end analysis pipeline in Python",
                category=PromptCategory.DATA_EXPLORATION,
                variables=["dataset_profile", "analysis_goals", "available_columns", "target_column"],
                output_format=OutputFormat.PYTHON,
                system_prompt="You are a senior data scientist. Create production-ready analysis pipelines with proper structure, logging, and error handling.",
                template="""Generate a complete Python analysis pipeline.

## Dataset Profile
{dataset_profile}

## Analysis Goals
{analysis_goals}

## Available Columns
{available_columns}

## Target Column (if predictive)
{target_column}

Generate a complete, modular Python pipeline with:
1. **Data Loading & Validation** - Load, validate schema, check quality
2. **Exploratory Data Analysis** - Statistics, distributions, correlations
3. **Data Cleaning** - Handle missing, outliers, type conversions
4. **Feature Engineering** - Create derived features, encodings
5. **Analysis/Modeling** - Statistical tests, ML models as appropriate
6. **Visualization** - Key charts for insights
7. **Reporting** - Summary output

Structure as a class-based pipeline with config, logging, and clear separation of concerns.
Return ONLY the Python code.
""",
            )
        )

        # ==================== DASHBOARD EXPLANATIONS ====================

        self._add_prompt(
            PromptTemplate(
                id="dashboard_explanation",
                name="Dashboard Explanation",
                description="Explain dashboard charts, KPIs, and insights in plain language",
                category=PromptCategory.DASHBOARD_GENERATION,
                variables=["dashboard_spec", "dataset_profile", "audience"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a BI expert explaining dashboards to business users. Be clear, actionable, and highlight key takeaways.",
                template="""Explain this dashboard for a {audience} audience.

## Dashboard Specification
{dashboard_spec}

## Dataset Profile
{dataset_profile}

Provide a clear explanation with:

### 1. Dashboard Purpose
What business questions does this dashboard answer?

### 2. Key Metrics (KPIs) Explained
For each KPI:
- What it measures
- Why it matters
- What good/bad looks like
- How to interpret trends

### 3. Chart Walkthrough
For each chart:
- What it shows
- Key patterns to look for
- How to use filters/drill-downs

### 4. How to Use This Dashboard
- Recommended workflow
- Key filters to try
- Common questions it answers

### 5. Data Freshness & Limitations
- Refresh schedule
- Known data issues
- Assumptions made

Write in plain language, avoid jargon. Use examples from the data.
""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="chart_interpretation",
                name="Chart Interpretation",
                description="Interpret a specific chart and explain insights",
                category=PromptCategory.CHART_RECOMMENDATION,
                variables=["chart_config", "chart_data", "dataset_profile", "business_context"],
                output_format=OutputFormat.MARKDOWN,
                system_prompt="You are a data visualization expert. Explain charts clearly with actionable insights.",
                template="""Interpret this chart and provide actionable insights.

## Chart Configuration
{chart_config}

## Chart Data Summary
{chart_data}

## Dataset Profile
{dataset_profile}

## Business Context
{business_context}

Provide:

### 1. What This Chart Shows
Plain language description of the visualization

### 2. Key Observations
- 3-5 specific patterns, trends, or anomalies visible
- Reference specific data points

### 3. Business Implications
- What this means for the business
- Potential actions to consider

### 4. Questions to Ask
- Follow-up questions this chart raises
- Additional analyses that would help

### 5. Caveats
- Data limitations affecting interpretation
- Assumptions made
""",
            )
        )

        # ==================== BUSINESS INSIGHTS ====================

        self._add_prompt(
            PromptTemplate(
                id="business_insights",
                name="Business Insights Generation",
                description="Generate deep business insights from data with strategic recommendations",
                category=PromptCategory.DATA_EXPLORATION,
                variables=["dataset_profile", "sample_data", "business_domain", "key_questions", "time_period"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a senior business analyst. Generate insights that drive decisions, not just observations.",
                template="""Generate deep business insights from this dataset.

## Dataset Profile
{dataset_profile}

## Sample Data
{sample_data}

## Business Domain
{business_domain}

## Key Business Questions
{key_questions}

## Time Period
{time_period}

Return JSON with:
{{
  "insights": [
    {{
      "category": "revenue|customer|operations|product|marketing|finance|risk",
      "title": "Short insight title",
      "finding": "Detailed finding with specific numbers from the data",
      "evidence": "Supporting data points, statistics, or patterns",
      "impact": "high|medium|low",
      "confidence": 0.0-1.0,
      "recommendation": "Specific, actionable recommendation",
      "priority": "immediate|short_term|strategic",
      "estimated_impact": "Quantified impact if possible (e.g., revenue increase, cost savings)",
      "owner": "Suggested team/role to own this",
      "related_metrics": ["metric1", "metric2"]
    }}
  ],
  "summary": "2-3 sentence executive summary",
  "key_metrics_table": [
    {{"metric": "...", "current": 0.0, "trend": "up|down|stable", "benchmark": 0.0}}
  ],
  "strategic_themes": ["theme1", "theme2", "theme3"]
}}
""",
            )
        )

        # ==================== FORECASTING SUGGESTIONS ====================

        self._add_prompt(
            PromptTemplate(
                id="forecasting_suggestions",
                name="Forecasting Suggestions",
                description="Recommend forecasting approaches, models, and configurations for a dataset",
                category=PromptCategory.FORECASTING,
                variables=["dataset_profile", "time_columns", "target_columns", "business_context", "forecast_horizon"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a forecasting expert. Recommend appropriate methods based on data characteristics and business needs.",
                template="""Recommend forecasting approaches for this dataset.

## Dataset Profile
{dataset_profile}

## Time Columns Available
{time_columns}

## Target Columns to Forecast
{target_columns}

## Business Context
{business_context}

## Desired Forecast Horizon
{forecast_horizon}

Return JSON with:
{{
  "recommendations": [
    {{
      "target_column": "...",
      "recommended_method": "prophet|arima|ets|linear|ml|ensemble",
      "reason": "Why this method fits the data characteristics",
      "seasonality": "daily|weekly|monthly|yearly|none",
      "trend_type": "linear|exponential|damped|none",
      "data_requirements": {{
        "min_periods": 0,
        "preferred_periods": 0,
        "missing_data_tolerance": "low|medium|high"
      }},
      "configuration": {{
        "changepoint_prior_scale": 0.05,
        "seasonality_mode": "additive|multiplicative",
        "interval_width": 0.95
      }},
      "validation_strategy": "time_series_split|rolling_window|expanding_window",
      "expected_accuracy": "Qualitative assessment",
      "caveats": ["caveat1", "caveat2"],
      "alternative_methods": ["method1", "method2"]
    }}
  ],
  "general_guidance": "Overall forecasting strategy recommendations",
  "data_prep_steps": ["step1", "step2", "step3"]
}}
""",
            )
        )

        # ==================== SQL GENERATION WITH EXECUTION ====================

        self._add_prompt(
            PromptTemplate(
                id="sql_generation_with_execution",
                name="SQL Generation with Execution Plan",
                description="Generate SQL with execution preview and optimization hints",
                category=PromptCategory.SQL_GENERATION,
                variables=["question", "schema", "sample_data", "dialect", "performance_hints"],
                output_format=OutputFormat.JSON,
                system_prompt="You are a SQL expert. Generate optimized, safe queries with execution plans.",
                template="""Generate SQL with execution preview for this question.

## Question
{question}

## Database Schema
{schema}

## Sample Data
{sample_data}

## SQL Dialect
{dialect}

## Performance Hints
{performance_hints}

Return JSON with:
{{
  "sql": "SELECT query with comments",
  "explanation": "Plain language explanation",
  "is_safe": true,
  "estimated_rows": 0,
  "columns": ["col1", "col2"],
  "execution_plan": {{
    "estimated_cost": "low|medium|high",
    "indexes_used": ["index1", "index2"],
    "full_table_scans": ["table1"],
    "joins": [{{"type": "hash|merge|nested_loop", "tables": ["t1", "t2"]}}],
    "optimization_suggestions": ["suggestion1", "suggestion2"]
  }},
  "safety_checks": {{
    "has_limit": true,
    "no_write_operations": true,
    "no_dangerous_functions": true
  }},
  "parameterized_version": "Query with placeholders for parameters"
}}
""",
            )
        )

        # ==================== PYTHON CODE FOR SPECIFIC TASKS ====================

        self._add_prompt(
            PromptTemplate(
                id="python_visualization_code",
                name="Python Visualization Code",
                description="Generate Python code for specific chart types",
                category=PromptCategory.CHART_RECOMMENDATION,
                variables=["chart_type", "dataset_profile", "columns", "chart_config"],
                output_format=OutputFormat.PYTHON,
                system_prompt="You are a Python visualization expert. Generate clean, publication-ready charts using matplotlib, seaborn, or plotly.",
                template="""Generate Python code to create this visualization.

## Chart Type
{chart_type}

## Dataset Profile
{dataset_profile}

## Columns to Use
{columns}

## Chart Configuration
{chart_config}

Generate complete Python code that:
1. Loads the data
2. Prepares/transforms data for the chart
3. Creates the visualization with proper styling
4. Saves to file
5. Includes accessibility considerations (colorblind-safe palettes, labels)

Use matplotlib/seaborn for static, plotly for interactive.
Return ONLY the Python code.
""",
            )
        )

        self._add_prompt(
            PromptTemplate(
                id="python_statistical_analysis",
                name="Python Statistical Analysis",
                description="Generate Python code for statistical tests and analysis",
                category=PromptCategory.DATA_EXPLORATION,
                variables=["analysis_type", "dataset_profile", "columns", "hypothesis"],
                output_format=OutputFormat.PYTHON,
                system_prompt="You are a statistician. Generate rigorous statistical analysis code with proper tests, assumptions checking, and interpretation.",
                template="""Generate Python code for this statistical analysis.

## Analysis Type
{analysis_type}

## Dataset Profile
{dataset_profile}

## Columns to Analyze
{columns}

## Hypothesis / Research Question
{hypothesis}

Generate code that:
1. Checks assumptions for the test
2. Performs the appropriate statistical test
3. Reports effect sizes and confidence intervals
4. Provides clear interpretation
5. Creates relevant visualizations (QQ plots, residuals, etc.)

Common analyses: t-test, ANOVA, chi-square, correlation, regression, Mann-Whitney, Kruskal-Wallis, normality tests, etc.
Return ONLY the Python code.
""",
            )
        )

    def _add_prompt(self, prompt: PromptTemplate) -> None:
        """Add a prompt to the library."""
        self._prompts[prompt.id] = prompt

    def get_prompt(self, prompt_id: str) -> Optional[PromptTemplate]:
        """Get a prompt by ID."""
        return self._prompts.get(prompt_id)

    def list_prompts(
        self,
        category: Optional[PromptCategory] = None,
        tags: Optional[list[str]] = None,
    ) -> list[PromptTemplate]:
        """List prompts with optional filtering."""
        prompts = list(self._prompts.values())

        if category:
            prompts = [p for p in prompts if p.category == category]

        if tags:
            prompts = [p for p in prompts if any(tag in p.tags for tag in tags)]

        return prompts

    def get_categories(self) -> list[PromptCategory]:
        """Get all available categories."""
        return list(PromptCategory)

    def search_prompts(self, query: str) -> list[PromptTemplate]:
        """Search prompts by name, description, or tags."""
        query_lower = query.lower()
        results = []
        for prompt in self._prompts.values():
            if (
                query_lower in prompt.name.lower()
                or query_lower in prompt.description.lower()
                or any(query_lower in tag.lower() for tag in prompt.tags)
            ):
                results.append(prompt)
        return results

    def render_prompt(self, prompt_id: str, **kwargs) -> str:
        """Render a prompt template with variables."""
        prompt = self.get_prompt(prompt_id)
        if not prompt:
            raise ValueError(f"Prompt '{prompt_id}' not found")

        missing = prompt.validate_variables(**kwargs)
        if missing:
            raise ValueError(f"Missing required variables: {missing}")

        return prompt.render(**kwargs)


# Global prompt library instance
_library: Optional[PromptLibrary] = None


def get_prompt_library() -> PromptLibrary:
    """Get or create the global prompt library instance."""
    global _library
    if _library is None:
        _library = PromptLibrary()
    return _library