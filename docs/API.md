# AI Data Analyst - API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All endpoints (except health) require authentication via JWT Bearer token.

```
Authorization: Bearer <access_token>
```

## Core Endpoints

### Health
```
GET /health
```
Returns service health status.

### Authentication
```
POST /auth/register          # Register new user
POST /auth/login             # Login (returns access + refresh tokens)
POST /auth/refresh           # Refresh access token
POST /auth/logout            # Logout
GET  /auth/me                # Get current user info
POST /auth/verify-email      # Verify email
POST /auth/forgot-password   # Request password reset
POST /auth/reset-password    # Reset password
```

### Datasets
```
POST   /datasets/upload              # Upload dataset file
GET    /datasets                     # List datasets (paginated)
GET    /datasets/{id}                # Get dataset details
DELETE /datasets/{id}                # Delete dataset (soft)
GET    /datasets/{id}/download       # Download original file
```

### Analytics (Traditional)
```
POST   /analytics/profile/{dataset_id}      # Column profiling
GET    /analytics/profile/{dataset_id}      # Get existing profile
POST   /analytics/correlate/{dataset_id}    # Correlation analysis
POST   /analytics/insights/{dataset_id}     # AI insights (legacy)
GET    /analytics/insights/{dataset_id}     # Get existing insights
POST   /analytics/analyze/{dataset_id}      # Comprehensive analysis
GET    /analytics/report/{dataset_id}       # Get analysis report
GET    /analytics/runs                      # List analysis runs
GET    /analytics/runs/{run_id}             # Get run details
```

### Visualizations
```
POST /visualizations/bar           # Bar chart
POST /visualizations/histogram     # Histogram
POST /visualizations/scatter       # Scatter plot
POST /visualizations/line          # Line chart
POST /visualizations/heatmap       # Correlation heatmap
POST /visualizations/pie           # Pie chart
POST /visualizations/box           # Box plot
POST /visualizations/grouped-bar   # Grouped bar chart
GET  /visualizations/preview/{dataset_id}  # Auto-generated preview charts
```

### Exports
```
GET /exports/profile/{dataset_id}      # Export profile (CSV/XLSX)
GET /exports/correlations/{dataset_id} # Export correlations
GET /exports/report/{dataset_id}       # Export report
GET /exports/insights/{dataset_id}     # Export insights
GET /exports/dataset/{dataset_id}      # Export raw dataset
```

---

## AI Analytics Endpoints (New)

### Dataset Profiling (Smart Analysis)

#### Generate Full Profile
```
POST /ai/profile/{dataset_id}
```
**Request:**
```json
{
  "force": false
}
```
**Response:** `ProfileDatasetResponse`
- Complete dataset profile with quality metrics
- Business summary
- Suggested charts, KPIs, dashboards

### Data Quality Assessment

#### Get Quality Report
```
GET /ai/quality/{dataset_id}
```
**Response:** `DataQualityResponse`
- Overall score (0-1)
- Completeness, consistency, accuracy, validity, uniqueness
- Column-level scores
- Issues with severity and suggested fixes

### Automatic Insights

#### Generate Insights
```
GET /ai/insights/{dataset_id}?max_insights=10
```
**Response:** `InsightsResponse`
- Ranked insights by severity/confidence
- Types: correlation, data_quality, pattern, outlier, recommendation
- Each with title, description, details, recommendation

### AI Data Cleaning

#### Get Cleaning Plan
```
GET /ai/cleaning/plan/{dataset_id}
```
**Response:** `CleaningPlanRequest`
- Ordered list of cleaning steps
- Operations: drop_duplicates, fill_missing, convert_type, standardize_format, remove_outliers, trim_whitespace, normalize_case
- Rollback plan and validation queries

#### Execute Cleaning Plan
```
POST /ai/cleaning/execute/{dataset_id}
```
**Request:** `CleaningPlanRequest`
**Response:** `CleaningExecuteResponse`
- Steps executed
- Rows affected
- Errors (if any)
- Original/final shape

### Predictive Analytics (Forecasting)

#### Generate Forecast
```
POST /ai/forecast/{dataset_id}
```
**Request:**
```json
{
  "date_column": "date",
  "value_column": "sales",
  "periods": 12,
  "confidence": 0.95
}
```
**Response:** `ForecastResponse`
- Model used
- Forecast array with dates, predicted values, confidence intervals
- Accuracy metrics (MAE, MAPE, RMSE)
- Trend direction
- Seasonality detection
- Assumptions and risks

### Anomaly Detection

#### Detect Anomalies
```
GET /ai/anomalies/{dataset_id}
```
**Response:** `AnomalyResponse`
- Point anomalies (statistical outliers)
- Contextual anomalies (unusual in context)
- Collective anomalies (sequence anomalies)
- Fraud indicators
- Summary with counts and recommended actions

### Chart Recommendations

#### Get Recommendations
```
GET /ai/charts/recommend/{dataset_id}?analysis_goal=exploratory&audience=analyst
```
**Parameters:**
- `analysis_goal`: exploratory | presentation | monitoring | comparison
- `audience`: analyst | executive | technical | general

**Response:** `ChartRecommendationsResponse`
- Prioritized chart recommendations with reasoning
- Dashboard layout suggestions
- Color scheme and accessibility notes

### Natural Language Query

#### Convert NL to SQL
```
POST /ai/nlq/{dataset_id}
```
**Request:**
```json
{
  "question": "Show me total sales by region for last month"
}
```
**Response:** `NLQueryResponse`
- Safe SQL query (SELECT only)
- Explanation
- Safety validation result
- Estimated rows and columns

#### Explain SQL
```
POST /ai/sql/explain
```
**Request:**
```json
{
  "sql": "SELECT region, SUM(sales) FROM data GROUP BY region"
}
```
**Response:** `SQLExplainResponse`
- Plain language explanation
- Step-by-step breakdown
- Business questions answered
- Performance considerations

### Report Generation

#### Generate Report
```
POST /ai/reports/{dataset_id}
```
**Request:**
```json
{
  "time_period": "Last 30 days",
  "report_type": "executive"
}
```
**Report Types:**
- `executive` - C-suite focused, strategic
- `technical` - Detailed methodology, code
- `business` - Operational KPIs, benchmarks

**Response:** `ReportResponse`
- Markdown formatted report
- Sections: findings, metrics, recommendations, risks

### Dashboard Generation

#### Generate Dashboard Spec
```
POST /ai/dashboard/{dataset_id}
```
**Request:**
```json
{
  "business_context": "Sales performance tracking",
  "user_roles": ["analyst", "manager", "executive"],
  "key_questions": ["What drives revenue?", "Which regions underperform?"]
}
```
**Response:** `DashboardResponse`
- Complete dashboard specification
- KPIs with targets and thresholds
- Charts with positions and configurations
- Filters with cross-filtering
- Tabbed layout

### Conversational AI

#### Chat About Dataset
```
POST /ai/chat/{dataset_id}
```
**Request:**
```json
{
  "message": "Why did sales drop in March?",
  "conversation_id": "optional-uuid"
}
```
**Response:** `ChatMessageResponse`
- AI response
- Conversation ID (create new or continue)
- Model and provider used
- Token usage

#### Get Chat History
```
GET /ai/chat/history/{conversation_id}
```

#### List Conversations
```
GET /ai/chat/conversations/{dataset_id}
```

### Prompt Library

#### List Prompts
```
GET /ai/prompts?category=sales_analysis
```

#### Get Prompt Details
```
GET /ai/prompts/{prompt_id}
```

### Provider Management

#### Get Provider Status
```
GET /ai/providers/status
```
**Response:** `ProviderStatusResponse`
- Current active provider
- Available providers (configured)
- Healthy providers
- Health check results

#### Switch Provider
```
POST /ai/providers/switch?provider=gemini
```
Manually switch to a specific provider (for testing).

---

## Legacy LLM Endpoints

```
POST /llm/query           # Query LLM (now uses AI Gateway)
GET  /llm/history         # Query history
```

---

## Request/Response Models

### ProfileDatasetResponse
```json
{
  "dataset_id": "uuid",
  "dataset_name": "string",
  "row_count": 1000,
  "column_count": 10,
  "quality_score": 0.85,
  "completeness": 0.95,
  "consistency": 0.90,
  "accuracy": 0.80,
  "business_summary": "This dataset contains...",
  "suggested_charts": [...],
  "suggested_kpis": [...],
  "suggested_dashboards": [...],
  "generated_at": "2026-07-18T10:30:00Z"
}
```

### DataQualityResponse
```json
{
  "dataset_id": "uuid",
  "overall_score": 0.82,
  "completeness": 0.95,
  "consistency": 0.88,
  "accuracy": 0.80,
  "validity": 0.82,
  "uniqueness": 0.99,
  "issues": [
    {
      "type": "missing_values",
      "column": "email",
      "severity": "medium",
      "count": 50,
      "percentage": 5.0,
      "description": "5% missing emails",
      "suggested_action": "fill_mode",
      "action_params": {}
    }
  ],
  "suggestions": [...],
  "column_scores": {"email": 0.95, "name": 1.0, ...}
}
```

### InsightResponse
```json
{
  "type": "correlation",
  "severity": "high",
  "title": "Strong positive correlation",
  "description": "Revenue and sales have correlation of 0.95",
  "details": {"column_1": "revenue", "column_2": "sales", "correlation": 0.95},
  "recommendation": "Consider using revenue to predict sales",
  "confidence": 0.95
}
```

### ChartRecommendationResponse
```json
{
  "chart_type": "line",
  "title": "Sales over Time",
  "description": "Shows revenue trend",
  "x_column": "date",
  "y_columns": ["revenue"],
  "color_column": "region",
  "facet_column": null,
  "reason": "Time series trend analysis",
  "priority": 1,
  "config": {}
}
```

### NLQueryResponse
```json
{
  "sql": "SELECT region, SUM(sales) as total_sales FROM sales_data WHERE date >= '2024-01-01' GROUP BY region ORDER BY total_sales DESC LIMIT 100",
  "explanation": "This query calculates total sales by region...",
  "is_safe": true,
  "estimated_rows": 10,
  "columns": ["region", "total_sales"]
}
```

### ForecastResponse
```json
{
  "model": "Prophet",
  "forecast": [
    {"date": "2024-02-01", "predicted": 15000, "lower_bound": 14000, "upper_bound": 16000}
  ],
  "accuracy_metrics": {"mae": 500, "mape": 0.03, "rmse": 700},
  "trend": "increasing",
  "seasonality_detected": true,
  "assumptions": ["Linear trend continues", "No major external shocks"],
  "risks": ["Seasonal variation in Q4", "Economic uncertainty"]
}
```

### ChatMessageResponse
```json
{
  "conversation_id": "uuid",
  "response": "Based on the data, sales dropped in March due to...",
  "model": "gemini-1.5-flash",
  "provider": "gemini",
  "usage": {
    "prompt_tokens": 1500,
    "completion_tokens": 500,
    "total_tokens": 2000
  }
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "detail": "Error description",
  "status_code": 400,
  "error_code": "VALIDATION_ERROR"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (tenant isolation, permissions)
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable (all AI providers down)

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Auth | 5/min burst, 20/hour sustained |
| User endpoints | 100/hour |
| Tenant endpoints | 1000/hour |
| LLM/AI queries | 30/minute |
| File upload | 100MB max |

---

## WebSocket (Future)

Real-time streaming for long-running operations:
- Analysis progress updates
- Streaming AI responses
- Background task status

---

## SDK Examples

### Python
```python
import httpx

client = httpx.AsyncClient(base_url="http://localhost:8000/api/v1")
client.headers["Authorization"] = f"Bearer {token}"

# Upload dataset
with open("data.csv", "rb") as f:
    response = await client.post("/datasets/upload", files={"file": f})
dataset_id = response.json()["id"]

# Generate smart profile
profile = await client.post(f"/ai/profile/{dataset_id}", json={"force": True})

# Chat about dataset
chat = await client.post(f"/ai/chat/{dataset_id}", json={
    "message": "What are the key trends?"
})

# Generate forecast
forecast = await client.post(f"/ai/forecast/{dataset_id}", json={
    "date_column": "date",
    "value_column": "sales",
    "periods": 12
})
```

### cURL
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Upload dataset
curl -X POST http://localhost:8000/api/v1/datasets/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@data.csv"

# Get AI insights
curl -X GET http://localhost:8000/api/v1/ai/insights/$DATASET_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Versioning

API version in URL path: `/api/v1/`

Breaking changes will result in `/api/v2/` with deprecation notices.

---

## Support

For API issues, check:
1. Health endpoint: `GET /api/v1/health`
2. Provider status: `GET /api/v1/ai/providers/status`
3. Audit logs in database
4. Application logs (structured JSON)