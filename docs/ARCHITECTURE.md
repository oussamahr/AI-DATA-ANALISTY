# AI Data Analyst - Architecture Documentation

## Overview

This document describes the architecture of the AI Data Analyst backend, an enterprise-grade AI-powered analytics platform similar to Microsoft Fabric Copilot, Power BI Copilot, Tableau Pulse, and ChatGPT Data Analysis.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                              │
│  (Web UI, Mobile Apps, Third-party Integrations via REST API)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (FastAPI)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Auth      │ │  Datasets   │ │  Analytics  │ │    AI Analytics     │   │
│  │   /auth     │ │  /datasets  │ │ /analytics  │ │      /ai/*          │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌──────────────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
│   BUSINESS SERVICES      │ │  AI GATEWAY      │ │  DATA SERVICES         │
│  ┌────────────────────┐  │ │  ┌────────────┐  │ │  ┌──────────────────┐ │
│  │ DatasetService     │  │ │  │Provider Mgr│  │ │  │ AnalyticsService │ │
│  │ AuthService        │  │ │  │┌──────────┐ │  │ │  │ VisualizationSvc │ │
│  │ TenantService      │  │ │  ││OpenAI    │ │  │ │  │ ExportService    │ │
│  │ RoleService        │  │ │  ││Gemini    │ │  │ │  │ TransformService │ │
│  └────────────────────┘  │ │  ││Groq      │ │  │ │  └──────────────────┘ │
│                          │ │  ││OpenRouter│ │  │ │                       │
└──────────────────────────┘ │ │  ││Anthropic │ │  │ └────────────────────────┘
                             │ │  ││DeepSeek  │ │  │
                             │ │  └──────────┘ │  │
                             │ └────────────────┘  │
                             └─────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌──────────────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
│   DATA LAYER             │ │  INFRASTRUCTURE  │ │  EXTERNAL SERVICES     │
│  ┌────────────────────┐  │ │  ┌────────────┐  │ │  ┌──────────────────┐ │
│  │ PostgreSQL         │  │ │  │ Redis      │  │ │  │ OpenAI API       │ │
│  │ (AsyncPG + SQLAlchemy)│ │  │ (Celery    │  │ │  │ Google Gemini    │ │
│  │                    │  │ │  │  Broker)   │  │ │  │ Groq API         │ │
│  │ Models:            │  │ │  │            │  │ │  │ OpenRouter       │ │
│  │ - Users/Tenants    │  │ │  └────────────┘  │ │  │ Anthropic        │ │
│  │ - Datasets         │  │ │                  │ │  │ DeepSeek         │ │
│  │ - Conversations    │  │ │  ┌────────────┐  │ │  └──────────────────┘ │
│  │ - Analysis Results │  │ │  │ S3/MinIO   │  │ │                       │
│  │ - Audit Logs       │  │ │  │ (Storage)  │  │ │  ┌──────────────────┐ │
│  └────────────────────┘  │ │  └────────────┘  │ │  │ ClamAV (Scanner) │ │
└──────────────────────────┘ └──────────────────┘ └────────────────────────┘
```

## Core Components

### 1. AI Gateway (`app/services/ai_gateway/`)

The AI Gateway is the central abstraction layer for all AI provider interactions.

#### Key Classes:
- **`AIGateway`** - Main entry point for all AI operations
- **`ProviderManager`** - Handles provider selection, initialization, and automatic fallback
- **`AIProvider`** (abstract base) - Interface all providers must implement

#### Provider Priority (Automatic Fallback):
1. **Google Gemini** (default) - Flash/Pro models, vision, embeddings
2. **Groq** - Fast inference, Llama/Qwen/Gemma/DeepSeek models
3. **OpenRouter** - Access to 100+ models (free & paid)
4. **OpenAI** - GPT-4o, GPT-4o-mini, embeddings
5. **Anthropic** - Claude 3.5 Sonnet, Opus, Haiku
6. **DeepSeek** - DeepSeek Chat, Coder

#### Supported Operations:
- `chat()` - Chat completions with tool calling
- `stream_chat()` - Streaming responses
- `generate()` - Simple text generation
- `structured_generate()` - JSON schema validated output
- `embeddings()` - Vector embeddings
- `vision()` - Multimodal image analysis

### 2. AI Analytics Engine (`app/services/ai_gateway/analytics/`)

Implements all advanced AI-powered analytics features.

#### Capabilities:

| Feature | Description | Endpoint |
|---------|-------------|----------|
| **Smart Dataset Profiling** | Automatic analysis on upload: profile, quality score, suggestions | `POST /ai/profile/{dataset_id}` |
| **Data Quality Engine** | Completeness, consistency, accuracy, validity, uniqueness scoring | `GET /ai/quality/{dataset_id}` |
| **Automatic Insights** | Ranked insights: correlations, anomalies, patterns, quality issues | `GET /ai/insights/{dataset_id}` |
| **AI Data Cleaning** | One-click executable cleaning plans with rollback | `GET/POST /ai/cleaning/*` |
| **Predictive Analytics** | Time-series forecasting with confidence intervals | `POST /ai/forecast/{dataset_id}` |
| **Anomaly Detection** | Point, contextual, collective anomalies + fraud indicators | `GET /ai/anomalies/{dataset_id}` |
| **Chart Recommendation** | AI-powered visualization suggestions with reasoning | `GET /ai/charts/recommend/{dataset_id}` |
| **Natural Language Query** | NL → Safe SQL (SELECT only, no destructive operations) | `POST /ai/nlq/{dataset_id}` |
| **Report Generation** | Executive, Technical, Business reports (Markdown/PDF/Word/HTML) | `POST /ai/reports/{dataset_id}` |
| **Dashboard Generation** | Complete dashboard specs: KPIs, charts, filters, tabs | `POST /ai/dashboard/{dataset_id}` |
| **Conversational AI** | Per-dataset chat with memory and context | `POST /ai/chat/{dataset_id}` |

### 3. Conversation Memory (`app/services/ai_gateway/memory/`)

Persistent conversation history per dataset.

- **Per-dataset conversations** - Each dataset has independent chat history
- **Automatic context injection** - Recent messages included in context window
- **Token-aware truncation** - Keeps system prompt + recent messages within limits
- **Export/Import** - JSON and Markdown formats
- **Multi-tenant isolation** - Tenant-scoped conversations

### 4. Prompt Library (`app/services/ai_gateway/prompts/`)

Built-in, tested prompt templates for common analytics tasks.

#### Categories (17 total):
- Data Exploration (2) - Explain Dataset, Find Trends
- Sales Analysis (1) - Sales Analysis
- Marketing Analysis (1) - Marketing Analysis
- Finance Analysis (1) - Finance Analysis
- Customer Analysis (1) - Customer Analysis
- Risk Analysis (1) - Risk Analysis
- Inventory Analysis (1) - Inventory Analysis
- Forecasting (1) - Forecast Revenue
- Data Cleaning (2) - Cleaning Suggestions, One-Click Plan
- Anomaly Detection (1) - Anomaly Detection
- Chart Recommendation (1) - Chart Recommendation
- Report Generation (3) - Executive, Technical, Business
- Dashboard Generation (1) - Dashboard Generation
- SQL Generation (2) - NL to SQL, Explain SQL
- Root Cause Analysis (1) - Root Cause Analysis
- KPI Generation (1) - KPI Generation
- Executive Summary (1) - Executive Summary

### 5. Core Business Services (Existing)

- **DatasetService** - Upload, validation, storage, profiling
- **AnalyticsService** - Statistical analysis, correlations, profiling
- **VisualizationService** - Chart generation (bar, line, scatter, heatmap, etc.)
- **ExportService** - CSV/Excel export with security sanitization
- **AuthService** - JWT authentication, OIDC, roles, tenants
- **TransformService** - Data transformations

## Data Flow Examples

### 1. Dataset Upload with Smart Profiling

```
POST /api/v1/datasets/upload
    │
    ▼
DatasetService.save_dataset()
    │
    ▼
Background Task: AIAnalyticsEngine.profile_dataset_on_upload()
    │
    ├── Load DataFrame
    ├── Prepare Context (schema, stats, samples)
    ├── AI Gateway: explain_dataset prompt
    ├── Calculate Quality Metrics
    ├── Generate Chart/KPI/Dashboard Suggestions
    └── Store Profile in AnalysisResult
    │
    ▼
Return: DatasetProfile with quality_score, insights, suggestions
```

### 2. Conversational Analysis

```
POST /api/v1/ai/chat/{dataset_id}
    │
    ▼
AIAnalyticsEngine.chat_about_dataset()
    │
    ├── Get/Create Conversation (ConversationMemory)
    ├── Load Dataset Context
    ├── Build Message History (token-aware)
    ├── AI Gateway: chat() with system prompt + context
    ├── Store User Message
    ├── Store Assistant Response
    └── Return Response + Conversation ID
```

### 3. Natural Language to SQL

```
POST /api/v1/ai/nlq/{dataset_id}
    │
    ▼
AIAnalyticsEngine.natural_language_to_sql()
    │
    ├── Load Dataset Schema
    ├── Build Schema Context
    ├── AI Gateway: natural_language_to_sql prompt
    ├── Validate SQL Safety (no DELETE/UPDATE/DROP/ALTER/TRUNCATE)
    └── Return SQL + Explanation + Safety Flag
```

### 4. Automatic Provider Fallback

```
AIGateway.chat()
    │
    ▼
ProviderManager.chat()
    │
    ├── Try Provider 1 (Gemini)
    │     └── Success? → Return response
    │     └── Failure? → Mark unhealthy, try next
    │
    ├── Try Provider 2 (Groq)
    │     └── Success? → Return response
    │     └── Failure? → Mark unhealthy, try next
    │
    ├── ... (OpenRouter, OpenAI, Anthropic, DeepSeek)
    │
    └── All failed? → Raise RuntimeError
```

## Security Architecture

### Authentication & Authorization
- **JWT Tokens** - Access (15min) + Refresh (7 days)
- **Multi-tenant Isolation** - Row-level security via tenant_id
- **Role-Based Access** - System roles + custom roles
- **OIDC Integration** - Enterprise SSO support

### AI Safety
- **Prompt Injection Detection** - Pattern matching + sanitization
- **SQL Injection Prevention** - Allow-list validation (SELECT only)
- **Data Sanitization** - CSV formula injection prevention
- **Audit Logging** - All AI queries logged with user/tenant context

### Rate Limiting
- **Auth endpoints**: 5/min burst, 20/hour sustained
- **User endpoints**: 100/hour
- **Tenant endpoints**: 1000/hour
- **LLM queries**: 30/minute

## Deployment Architecture

### Services
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API Pod   │     │   API Pod   │     │   API Pod   │  (Horizontal scaling)
│  (FastAPI)  │     │  (FastAPI)  │     │  (FastAPI)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
              ┌────────────────────────┐
              │    Load Balancer       │
              │    (nginx/Traefik)     │
              └───────────┬────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PostgreSQL   │ │     Redis     │ │   S3/MinIO    │
│  (Primary)    │ │  (Cache/Queue)│ │  (File Store) │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PostgreSQL   │ │     Redis     │ │   S3/MinIO    │
│  (Replica)    │ │  (Replica)    │ │  (Replica)    │
└───────────────┘ └───────────────┘ └───────────────┘
```

### Background Workers (Celery)
- **Analytics Tasks** - Profiling, correlations, comprehensive analysis
- **AI Insights** - Async insight generation
- **Transform Tasks** - Data transformations
- **Export Tasks** - Large file exports

## Configuration

### Environment Variables

```bash
# AI Provider Configuration
AI_PROVIDER=gemini
AI_PROVIDER_PRIORITY=gemini,groq,openrouter,openai,anthropic,deepseek

# Provider API Keys
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=

# Legacy (deprecated)
LLM_PROVIDER=openai
LLM_API_KEY=
LLM_MODEL=gpt-4o
```

### Model Configuration

Each provider supports configurable models:

| Provider | Default Model | Available Models |
|----------|---------------|------------------|
| Gemini | gemini-1.5-flash | gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro |
| Groq | llama-3.1-70b-versatile | llama-3.1-8b, mixtral-8x7b, gemma2-9b, qwen2.5-72b |
| OpenRouter | google/gemini-2.5-flash | 100+ models |
| OpenAI | gpt-4o | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| Anthropic | claude-3-5-sonnet | claude-3-5-sonnet, claude-3-opus, claude-3-haiku |
| DeepSeek | deepseek-chat | deepseek-chat, deepseek-coder |

## Extending the Platform

### Adding a New AI Provider

1. Create provider class in `app/services/ai_gateway/providers/`
2. Implement `AIProvider` interface
3. Add to `PROVIDER_CLASSES` registry
4. Add configuration to `ProviderManager._build_provider_config()`
5. Add API key to environment variables
6. Add to `DEFAULT_PROVIDER_PRIORITY` if desired

### Adding a New Analytics Feature

1. Add method to `AIAnalyticsEngine`
2. Create prompt template in `PromptLibrary`
3. Add API endpoint in `app/api/v1/ai_analytics.py`
4. Add request/response models
5. Register in audit logger

### Adding a New Prompt Template

1. Add `PromptTemplate` to `PromptLibrary._initialize_prompts()`
2. Define variables, output format, system prompt
3. Test with `library.render_prompt()`

## Monitoring & Observability

### Health Checks
- `GET /api/v1/health` - Basic health
- `GET /api/v1/ai/providers/status` - Provider health
- `GET /api/v1/ai/providers/health` - Detailed health check

### Metrics to Monitor
- API latency (p50, p95, p99)
- Provider success/failure rates
- Fallback frequency
- Token usage per provider
- Conversation length
- Background task queue depth

### Logging
- Structured JSON logging
- Audit logs for all AI operations
- Error tracking with context

## Performance Considerations

### Caching
- Dataset profiles cached after first generation
- Provider health checks cached (30s TTL)
- Conversation context built from recent messages only

### Async Processing
- All AI operations are async
- Background tasks for heavy analysis
- Streaming responses for long generations

### Database Optimization
- Indexed foreign keys (dataset_id, user_id, tenant_id)
- Soft deletes for audit trail
- JSON columns for flexible analytics results

## Future Enhancements

### Planned Features
- [ ] Vector database integration (pgvector) for semantic search
- [ ] Fine-tuned models for domain-specific analysis
- [ ] Real-time collaboration on reports/dashboards
- [ ] Automated data pipeline (ETL) with AI suggestions
- [ ] Mobile-optimized dashboard rendering
- [ ] Multi-language support for reports
- [ ] Advanced anomaly detection (Isolation Forest, LSTM)
- [ ] Feature store integration
- [ ] Model versioning and A/B testing
- [ ] Cost tracking per provider/query

---

*Last Updated: 2026-07-18*
*Version: 2.0.0*