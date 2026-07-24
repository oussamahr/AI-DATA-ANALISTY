# AI Data Analyst - Enterprise AI Analytics Platform

An enterprise-grade, AI-first analytics platform similar to **Microsoft Fabric Copilot**, **Power BI Copilot**, **Tableau Pulse**, **ChatGPT Data Analysis**, **Hex**, and **DataRobot**.

The AI is the central interface for interacting with datasets — not just a bolt-on feature.

## 🎯 Key Features

### AI-First Architecture
- **AI Gateway** - Unified abstraction layer for all AI providers
- **Automatic Provider Fallback** - Priority: Gemini → Groq → OpenRouter → OpenAI → Anthropic → DeepSeek
- **6 Providers Supported** - OpenAI, Google Gemini, Groq, OpenRouter, Anthropic, DeepSeek
- **OpenRouter Integration** - Access 100+ models (free & paid): `deepseek/deepseek-chat`, `google/gemini-2.5-flash`, `meta-llama/llama-3.3`, `qwen/qwen3`, `mistralai/mistral`
- **Groq Support** - Ultra-fast inference: Llama 3.1, Qwen, DeepSeek, Gemma, Mixtral
- **Gemini Default** - Flash/Pro with vision, embeddings, 1M+ context

### Smart Dataset Analysis (Auto on Upload)
- Dataset profile with quality score (completeness, consistency, accuracy)
- Missing values, outliers, duplicates detection
- Correlation matrix, distributions, statistics
- Business summary + suggested charts/KPIs/dashboards

### Data Quality Engine
- Multi-dimensional scoring (completeness, consistency, accuracy, validity, uniqueness)
- Column-level quality scores
- Issue detection with severity and executable fix suggestions

### Automatic Insights
- Ranked insights: correlations, patterns, anomalies, quality issues, recommendations
- Severity-based prioritization (high/medium/low)
- Natural language explanations

### AI Data Cleaning (One-Click)
- Executable cleaning plans with rollback
- Operations: deduplicate, fill missing, convert types, standardize formats, handle outliers, trim whitespace
- Validation queries to verify results

### Predictive Analytics
- Time-series forecasting with confidence intervals
- Multiple model support (Prophet, ARIMA, ETS, Linear)
- Trend detection, seasonality analysis
- Accuracy metrics (MAE, MAPE, RMSE)

### Anomaly Detection
- Point anomalies (statistical outliers)
- Contextual anomalies (unusual in context)
- Collective anomalies (sequence patterns)
- Fraud indicators with investigation priority

### Chart Recommendation Engine
- AI-powered visualization suggestions with reasoning
- Supports: Line, Bar, Area, Scatter, Pie, Donut, Heatmap, Treemap, Box Plot
- Dashboard layout optimization
- Accessibility-aware color schemes

### Natural Language Query (NL → Safe SQL)
- Convert questions to read-only SQL
- **Security**: Blocks DELETE, UPDATE, DROP, ALTER, TRUNCATE, INSERT
- Schema-aware generation with explanations
- Row limits and timeout protection

### Report Generator
- **Executive Reports** - Strategic, C-suite focused
- **Technical Reports** - Methodology, code, reproducibility
- **Business Reports** - Operational KPIs, benchmarks
- Export: PDF, Word, Markdown, HTML

### Dashboard Generator
- Auto-generate KPIs, charts, filters, tabs
- Cross-filtering configuration
- Role-based layouts (analyst, manager, executive)

### Conversational AI with Memory
- Per-dataset conversation history
- Continue conversations across sessions
- Token-aware context injection
- Export/Import (JSON, Markdown)

### Prompt Library (17 Categories, 20+ Templates)
- Sales, Marketing, Finance, Customer, Risk, Inventory Analysis
- Forecasting, Data Cleaning, Anomaly Detection
- Chart Recommendation, Report Generation, Dashboard Generation
- SQL Generation, Root Cause Analysis, KPI Generation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (FastAPI)                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │   Auth     │ │ Datasets   │ │ Analytics  │ │ AI Analytics │  │
│  │  /auth     │ │ /datasets  │ │/analytics  │ │    /ai/*     │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ BUSINESS SERVICES │ │     AI GATEWAY      │ │   DATA SERVICES     │
│  ┌─────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │
│  │DatasetService│  │ │  │Provider Manager│  │ │  │AnalyticsService│ │
│  │AuthService   │  │ │  │┌─────────────┐│  │ │  │VisualizationSvc│ │
│  │TenantService │  │ │  ││OpenAI       ││  │ │  │ExportService   │ │
│  │RoleService   │  │ │  ││Gemini       ││  │ │  │TransformService│ │
│  └─────────────┘  │ │  ││Groq         ││  │ │  └───────────────┘  │
│                   │ │  ││OpenRouter   ││  │ │                     │
└───────────────────┘ │ │  ││Anthropic    ││  │ └─────────────────────┘
                      │ │  ││DeepSeek     ││  │
                      │ │  └─────────────┘│  │
                      │ └─────────────────┘  │
                      └──────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   DATA LAYER      │ │  INFRASTRUCTURE     │ │  EXTERNAL AI APIs   │
│  ┌─────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │
│  │ PostgreSQL  │  │ │  │ Redis         │  │ │  │ OpenAI        │  │
│  │ (AsyncPG)   │  │ │  │ (Celery/Rate) │  │ │  │ Google Gemini │  │
│  │             │  │ │  └───────────────┘  │ │  │ Groq          │  │
│  │ Models:     │  │ │                     │ │  │ OpenRouter    │  │
│  │ - Users     │  │ │  ┌───────────────┐  │ │  │ Anthropic     │  │
│  │ - Datasets  │  │ │  │ S3/MinIO      │  │ │  │ DeepSeek      │  │
│  │ - Conversat.│  │ │  │ (Files)       │  │ │  └───────────────┘  │
│  │ - Analysis  │  │ │  └───────────────┘  │ │                     │
│  │ - Audit     │  │ │                     │ └─────────────────────┘
│  └─────────────┘  │ └─────────────────────┘
└───────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- At least one AI provider API key

### Docker Compose (Recommended)

```bash
# Clone
git clone <repository>
cd AI-DATA-ANALISTY

# Configure
cp backend/.env.example backend/.env
# Edit backend/.env - add your AI provider keys

# Start
docker-compose -f docker/docker-compose.yml up -d

# API at http://localhost:8000
# Docs at http://localhost:8000/api/docs
```

### Local Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start dependencies
docker-compose up -d postgres redis minio

# Migrate
alembic upgrade head

# Run API
uvicorn app.main:app --reload --port 8000

# Run Celery (separate terminals)
celery -A app.core.celery_app worker --loglevel=info
celery -A app.core.celery_app beat --loglevel=info
```

## 🔧 Configuration

### Required Environment Variables

```bash
# AI Providers (at least one required)
AI_PROVIDER=gemini
AI_PROVIDER_PRIORITY=gemini,groq,openrouter,openai,anthropic,deepseek

GEMINI_API_KEY=your-gemini-key          # Google AI Studio
GROQ_API_KEY=your-groq-key              # Groq Cloud
OPENROUTER_API_KEY=your-openrouter-key  # OpenRouter
OPENAI_API_KEY=your-openai-key          # OpenAI
ANTHROPIC_API_KEY=your-anthropic-key    # Anthropic
DEEPSEEK_API_KEY=your-deepseek-key      # DeepSeek

# Database
DATABASE_URL=postgresql+asyncpg://postgres:pass@localhost:5432/ai_data

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-32-char-secret-key
ENVIRONMENT=development
```

### Provider Models

| Provider | Default | Available Models |
|----------|---------|------------------|
| **Gemini** | gemini-1.5-flash | gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro |
| **Groq** | llama-3.1-70b-versatile | llama-3.1-8b, mixtral-8x7b, gemma2-9b, qwen2.5-72b, deepseek-r1-distill-llama-70b |
| **OpenRouter** | google/gemini-2.5-flash | 100+ models (free & paid) |
| **OpenAI** | gpt-4o | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| **Anthropic** | claude-3-5-sonnet | claude-3-5-sonnet, claude-3-opus, claude-3-haiku |
| **DeepSeek** | deepseek-chat | deepseek-chat, deepseek-coder |

## 📚 API Endpoints

### AI Analytics (`/api/v1/ai/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/profile/{dataset_id}` | Smart dataset profiling (auto on upload) |
| `GET` | `/quality/{dataset_id}` | Data quality assessment |
| `GET` | `/insights/{dataset_id}` | Automatic ranked insights |
| `GET` | `/cleaning/plan/{dataset_id}` | Get executable cleaning plan |
| `POST` | `/cleaning/execute/{dataset_id}` | Execute cleaning plan (one-click) |
| `POST` | `/forecast/{dataset_id}` | Time-series forecasting |
| `GET` | `/anomalies/{dataset_id}` | Anomaly & fraud detection |
| `GET` | `/charts/recommend/{dataset_id}` | AI chart recommendations |
| `POST` | `/nlq/{dataset_id}` | Natural language → Safe SQL |
| `POST` | `/sql/explain` | Explain SQL in plain language |
| `POST` | `/reports/{dataset_id}` | Generate report (executive/technical/business) |
| `POST` | `/dashboard/{dataset_id}` | Generate dashboard specification |
| `POST` | `/chat/{dataset_id}` | Conversational AI with memory |
| `GET` | `/chat/history/{conversation_id}` | Get conversation history |
| `GET` | `/chat/conversations/{dataset_id}` | List dataset conversations |
| `GET` | `/prompts` | List prompt templates |
| `GET` | `/prompts/{prompt_id}` | Get prompt details |
| `GET` | `/providers/status` | Provider health & status |
| `POST` | `/providers/switch` | Manually switch provider |

### Traditional Endpoints
- `/api/v1/auth/*` - Authentication (register, login, OIDC, password reset)
- `/api/v1/datasets/*` - Dataset upload, list, download
- `/api/v1/analytics/*` - Profiling, correlations, legacy insights
- `/api/v1/visualizations/*` - Chart data (bar, line, scatter, heatmap, etc.)
- `/api/v1/exports/*` - CSV/Excel exports
- `/api/v1/transforms/*` - Data cleaning pipeline
- `/api/v1/llm/*` - Legacy LLM endpoints (now use AI Gateway)

## 💡 Usage Examples

### Smart Profiling (Auto on Upload)
```bash
curl -X POST http://localhost:8000/api/v1/ai/profile/{dataset_id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Conversational Analysis
```bash
curl -X POST http://localhost:8000/api/v1/ai/chat/{dataset_id} \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Why did revenue drop in March?"}'
```

### Natural Language to SQL
```bash
curl -X POST http://localhost:8000/api/v1/ai/nlq/{dataset_id} \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question": "Show me top 10 products by revenue last quarter"}'
```

### Forecasting
```bash
curl -X POST http://localhost:8000/api/v1/ai/forecast/{dataset_id} \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date_column": "date", "value_column": "sales", "periods": 12}'
```

### Generate Executive Report
```bash
curl -X POST http://localhost:8000/api/v1/ai/reports/{dataset_id} \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"report_type": "executive", "time_period": "Q1 2024"}'
```

### Python SDK Example
```python
import httpx

client = httpx.AsyncClient(base_url="http://localhost:8000/api/v1")
client.headers["Authorization"] = f"Bearer {token}"

# Upload dataset
with open("sales.csv", "rb") as f:
    dataset_id = (await client.post("/datasets/upload", files={"file": f})).json()["id"]

# Smart profile (auto-generated on upload, or force refresh)
profile = await client.post(f"/ai/profile/{dataset_id}", json={"force": True})

# Chat with data
chat = await client.post(f"/ai/chat/{dataset_id}", json={
    "message": "What are the key drivers of revenue?"
})

# Forecast
forecast = await client.post(f"/ai/forecast/{dataset_id}", json={
    "date_column": "date", "value_column": "revenue", "periods": 6
})

# Generate dashboard
dashboard = await client.post(f"/ai/dashboard/{dataset_id}", json={
    "business_context": "Sales performance tracking",
    "key_questions": ["What drives revenue?", "Which regions underperform?"]
})
```

## 🔒 Security

### Data Protection

- **AES-256 Encryption at Rest** - Conversation content, SQL queries, and DB connection credentials encrypted using AES-GCM with per-field encryption
- **TLS 1.3 for Data in Transit** - HSTS headers, HTTPS enforcement for S3 storage, SMTP over TLS, secure cookie transport
- **Password Security** - bcrypt hashing with configurable complexity requirements (min length, upper/lower/digit/special)
- **Database Credential Encryption** - DB connection passwords stored encrypted (`encrypted_username`, `encrypted_password` columns)

### Authentication & Access Control

- **Multi-tenant Isolation** - Row-level security via PostgreSQL RLS
- **JWT Authentication** - Access (15min) + Refresh (7 days) tokens with httpOnly, Secure, SameSite cookies
- **OIDC/SSO Support** - Enterprise SSO via OIDC (Auth0, Keycloak, etc.) with JWKS verification, auto-provisioning, and role mapping
- **Role-Based Access** - Admin, Analyst, Viewer + custom roles with tenant-scoped permissions
- **Email Verification** - Required for account activation with 48-hour token expiry
- **Password Reset** - Secure reset flow with 24-hour token expiry

### Audit & Compliance

- **Audit Logging** - All AI queries, data access, and admin actions logged with user ID, tenant ID, IP address, user agent, HTTP method, and path
- **Immutable Audit Trails** - PostgreSQL-backed audit logs with indexed timestamps for efficient querying
- **Data Export** - GDPR/CCPA data subject rights support via dataset export (CSV, XLSX, JSON)
- **Row-Level Security** - PostgreSQL RLS policies enforce tenant isolation at the database level

### Application Security

- **Prompt Injection Protection** - 8 detection patterns + sanitization
- **Safe SQL Execution** - Allow-list validation (SELECT only, no DDL/DML)
- **Rate Limiting** - Per-user (100/hr), per-tenant (1000/hr), per-auth-endpoint (5/min burst, 20/hr sustained)
- **CSV Injection Prevention** - Formula prefix sanitization in exports
- **Security Headers** - CSP, HSTS, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **CSRF Protection** - Token-based CSRF protection for state-changing requests
- **Body Size Limits** - 10MB default, 100MB for upload endpoints
- **Cache Control** - No-store headers on all API responses

### Planned Security Features

- **Multi-Factor Authentication (MFA)** - TOTP-based 2FA and WebAuthn hardware security key support
- **SAML 2.0** - Enterprise SAML integration alongside OIDC
- **SOC 2 Type II** - Independent security audit and annual recertification
- **7-Year Audit Retention** - Configurable audit log retention with tamper detection
- **Regional Data Residency** - Region-specific deployment options (EU, US, APAC)

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture, data flows, components |
| [API Reference](docs/API.md) | Complete API documentation with examples |
| [Deployment](docs/DEPLOYMENT.md) | Docker, Kubernetes, scaling, monitoring |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Local setup, extending, testing, contributing |

## 🧪 Testing

```bash
cd backend

# All tests
pytest tests/ -v

# AI Gateway tests
pytest tests/ai_gateway/ -v

# Coverage
pytest tests/ --cov=app --cov-report=html
```

### Test Structure
```
tests/ai_gateway/
├── test_providers.py       # Provider initialization, fallback
├── test_analytics_engine.py # Smart profiling, insights, forecasting
└── test_prompts.py         # Prompt library, rendering, categories
```

## 🛠️ Extending the Platform

### Add New AI Provider
1. Implement `AIProvider` interface in `app/services/ai_gateway/providers/`
2. Register in `PROVIDER_CLASSES` and `ProviderManager`
3. Add API key to config

### Add Analytics Feature
1. Add method to `AIAnalyticsEngine`
2. Create prompt template in `PromptLibrary`
3. Add API endpoint in `ai_analytics.py`
4. Register audit logging

### Add Prompt Template
```python
prompts.register_prompt_template(
    "my_analysis",
    "Analyze {dataset} for {metric}: {question}"
)
```

## 📦 Deployment

### Docker Compose (Production)
```bash
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/
# Includes: Deployment, Service, Ingress, HPA, ConfigMap, Secrets
```

### Monitoring
- Prometheus metrics via `/metrics`
- Grafana dashboards for API, AI providers, business metrics
- Health checks: `/api/v1/health`, `/api/v1/ai/providers/status`

## 🤝 Contributing

1. Fork & create feature branch
2. Run linting: `ruff check backend/` & `black backend/`
3. Run tests: `pytest tests/`
4. Update documentation
5. Submit PR

## 📄 License

MIT License - see LICENSE file

---

**Built with** FastAPI, SQLAlchemy, PostgreSQL, Redis, Celery, and ❤️

**AI Providers**: Google Gemini, Groq, OpenRouter, OpenAI, Anthropic, DeepSeek