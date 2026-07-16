# AI Data Analytics Platform

Multi-tenant AI-powered data analytics platform with role-based access control, email verification, and LLM-powered query capabilities.

## Tech Stack

- **Framework:** FastAPI (async Python 3.12)
- **Database:** PostgreSQL 16 + asyncpg (with Row-Level Security)
- **ORM:** SQLAlchemy 2.0 (async)
- **Auth:** JWT (access + refresh tokens), bcrypt, OIDC support, email verification
- **AI:** OpenAI API (GPT-4, configurable) with structured output
- **Cache:** Redis 7 (sessions, rate limiting)
- **Queue:** Celery (optional async tasks)
- **Storage:** S3-compatible (MinIO) or local filesystem
- **Antivirus:** ClamAV (optional in dev, required in staging/prod)
- **Email:** aiosmtplib (async SMTP)
- **Container:** Docker + docker-compose
- **Testing:** pytest, pytest-asyncio, httpx, aiosqlite, testcontainers (161 tests passing, 7 RLS skipped)

## Architecture

```
Browser (React/TS)
   │  HTTPS only, strict CSP
   ▼
FastAPI (Uvicorn)
   │
   ├── Security Middleware Stack
   │     ├── RequestContextMiddleware (X-Request-ID)
   │     ├── CSRFMiddleware (double-submit pattern)
   │     ├── BodySizeLimitMiddleware (10MB/100MB)
   │     ├── CacheControlMiddleware (no-store)
   │     ├── SecurityHeadersMiddleware (CSP, HSTS, X-Frame-Options)
   │     ├── RateLimitMiddleware (slowapi, per-user + per-IP, stricter on auth)
   │     └── TenantContextMiddleware (RLS context injection)
   │
   ├── File Ingestion Pipeline
   │     → validate_extension → validate_magic_bytes → ClamAV scan → S3 storage
   │
   ├── LLM Orchestration Layer
   │     → structured output (JSON schema) → QueryIntent
   │     → intent_validator → query_executor → PII redaction
   │
   ├── Database Connector (external DBs)
   │     → read-only connections → schema introspection → safe query execution
   │
   ├── Server-Side Chart Rendering
   │     → matplotlib PNG generation → bar, histogram, scatter, heatmap, pie
   │
   └── Audit & Monitoring
         → database-backed audit logs → structured JSON logging

PostgreSQL (RLS policies)      Redis (sessions, rate limits)
S3/MinIO (file storage)        ClamAV (antivirus scanning)
```

## Security Features

### Authentication & Authorization
- **JWT Tokens:** Short-lived access (15min) + refresh (7 days)
- **OIDC Support:** Auth0, Keycloak, or any OIDC provider
- **RBAC:** Admin, Analyst, Viewer roles with granular permissions
- **Session Management:** Redis-backed with idle (30min) + absolute (8hr) timeouts
- **Password Policy:** Min 8 chars, requires upper/lower/digit/special

### Input Validation
- **SQL Injection Prevention:** Pattern detection on all user inputs (16 endpoints)
- **XSS Prevention:** HTML tag sanitization on description fields
- **Pydantic Schemas:** Strict validation on all API endpoints
- **File Upload:** Extension whitelist + magic byte verification
- **Rate Limiting:** Redis-backed slowapi (per-user + per-IP, stricter on auth endpoints)
- **CSV Injection Prevention:** Prefix dangerous leading characters (=, +, -, @) in exports

### File Security
- **Magic Bytes:** Verifies file content matches declared type (not just extension)
- **ClamAV Scanning:** Malware detection on all uploads
- **S3 Storage:** Files stored in tenant-scoped buckets outside web root
- **Body Size Limits:** 10MB default, 100MB for uploads

### Database Security
- **Row-Level Security (RLS):** PostgreSQL policies enforce tenant isolation
- **Parameterized Queries:** SQLAlchemy ORM prevents SQL injection
- **Tenant Context:** Automatic RLS context injection per request

### LLM Security
- **Structured Output:** JSON schema constrains LLM response format
- **Query Intent Validator:** Whitelist-based validation before execution
- **PII Redaction:** Post-query redaction of sensitive columns
- **Prompt Injection Prevention:** Data wrapped in `<data>` tags, 8 injection patterns detected
- **Query Cost Limits:** Max 500k input rows, 10k output rows, 30s timeout

### Database Connector
- **Read-Only Connections:** External PostgreSQL databases via dedicated read-only role
- **Schema Introspection:** Automatic table/column metadata discovery
- **SQL Validation:** Dangerous patterns blocked (DROP, DELETE, INSERT, UPDATE, etc.)
- **Query Execution:** Parameterized queries with timeout + row limits

### Server-Side Chart Rendering
- **Matplotlib Backend:** Charts rendered server-side as PNG images
- **Supported Types:** Bar, histogram, scatter, heatmap, pie
- **No Client-Side Processing:** Raw data never leaves the server

### HTTP Security Headers
- `Content-Security-Policy: default-src 'self'`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Audit & Monitoring
- **Database Audit Logs:** All CRUD + auth events persisted to PostgreSQL (async)
- **Request Tracking:** X-Request-ID on every request
- **Cache Control:** no-store, no-cache headers on all API responses
- **Structured Logging:** JSON logs with PII redaction

## Getting Started

### Prerequisites

- Python 3.12+
- PostgreSQL 16 (or Docker)
- Redis 7 (or Docker)
- Docker + docker-compose (recommended)

### Quick Start (Docker)

```bash
# clone and enter
git clone <repo>
cd ai-data-analytics

# copy env and configure
cp .env.example .env
# edit .env — set SECRET_KEY, DATABASE_URL, LLM_API_KEY, etc.

# start all services (PostgreSQL, Redis, MinIO, ClamAV, API)
docker compose -f docker/docker-compose.yml up -d

# API available at http://localhost:8000
# API docs at http://localhost:8000/api/docs
# MinIO console at http://localhost:9001
```

### Local Development

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp ../.env.example ../.env  # edit as needed
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev  # available at http://localhost:3000, proxies /api to :8000
```

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/v1/              # Route handlers
│   │   │   ├── auth.py          # Register, login, verify, reset, profile
│   │   │   ├── tenants.py       # CRUD tenant, invite, accept, members
│   │   │   ├── roles.py         # CRUD roles, assign to users
│   │   │   ├── datasets.py      # Upload, list, get
│   │   │   ├── llm.py           # Query LLM, history
│   │   │   ├── analytics.py     # Profiling, correlations, AI insights
│   │   │   ├── transforms.py    # Data cleaning/wrangling pipeline
│   │   │   ├── visualizations.py # Chart-ready data endpoints
│   │   │   ├── exports.py       # CSV/Excel download endpoints
│   │   │   ├── admin.py         # Admin stats, user list
│   │   │   └── health.py        # Health check
│   │   ├── core/
│   │   │   ├── config.py        # Settings (pydantic-settings)
│   │   │   ├── database.py      # Async SQLAlchemy engine
│   │   │   ├── security/
│   │   │   │   ├── auth.py      # JWT, bcrypt, OIDC
│   │   │   │   ├── csrf.py      # CSRF double-submit
│   │   │   │   ├── middleware.py # Security middleware stack
│   │   │   │   ├── scanner.py   # ClamAV integration
│   │   │   │   ├── tenant_context.py # RLS context injection
│   │   │   │   ├── validators.py # Input validation
│   │   │   │   └── rate_limit.py # Redis rate limiting
│   │   │   └── storage/
│   │   │       └── s3.py        # S3/MinIO storage service
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   │   └── query_intent.py  # LLM query intent models
│   │   └── services/            # Business logic layer
│   │       ├── query_intent_validator.py
│   │       ├── query_executor.py
│   │       ├── post_query_redactor.py
│   │       ├── email_service.py
│   │       └── ...
│   ├── alembic/                 # DB migrations
│   │   └── versions/
│   │       └── add_rls_policies.py
│   └── tests/                   # pytest test suite (168 tests)
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml       # PostgreSQL, Redis, MinIO, ClamAV
├── docs/security/
│   ├── threat-model.md
│   ├── owasp-review.md
│   └── log-redaction-alerting.md
├── .env.example
├── pyproject.toml
├── IMPLEMENTATION_PLAN.md
└── .pre-commit-config.yaml
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, ProtectedRoute
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api.ts           # Axios client with auth interceptors
│   │   │   └── utils.ts         # cn() utility
│   │   ├── pages/               # Route pages
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DatasetsPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── VisualizationsPage.tsx
│   │   │   ├── TransformsPage.tsx
│   │   │   ├── LLMPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── stores/              # Zustand state management
│   │   │   ├── authStore.ts
│   │   │   └── datasetStore.ts
│   │   └── types/
│   │       └── api.ts           # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
```

## Environment Variables

```bash
# Core
SECRET_KEY=your-secret-key
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_data

# Auth
AUTH_MODE=local  # or "oidc"
OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=

# LLM
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4

# Storage
STORAGE_BACKEND=local  # or "s3"
S3_ENDPOINT=localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_PREFIX=ai-data-analyst

# Antivirus
CLAMAV_ENABLED=false  # true in staging/prod
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
```

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create account (password strength enforced) |
| POST | `/login` | Get JWT access + refresh tokens |
| POST | `/refresh` | Rotate tokens |
| POST | `/logout` | Invalidate session |
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update name fields |
| POST | `/change-password` | Change password |
| POST | `/verify-email` | Verify email via token |
| POST | `/resend-verification` | Resend verification link |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password via token |
| GET | `/oidc/config` | Get OIDC provider config |
| POST | `/oidc/login` | OIDC login |

### Tenants (`/api/v1/tenants`)

| Method | Path | Description |
|---|---|---|
| POST | `` | Create tenant (creator becomes admin) |
| GET | `/members` | List tenant members |
| DELETE | `/members/{id}` | Remove member from tenant |
| POST | `/invitations` | Invite user to tenant |
| GET | `/invitations` | List pending invitations |
| DELETE | `/invitations/{id}` | Revoke invitation |
| POST | `/accept-invitation` | Accept invite and create account |

### Roles (`/api/v1/roles`)

| Method | Path | Description |
|---|---|---|
| GET | `` | List all roles |
| POST | `` | Create custom role (admin only) |
| GET | `/{id}` | Get role details |
| PATCH | `/{id}` | Update role (admin only) |
| POST | `/{role_id}/assign/{user_id}` | Assign role to user (admin only) |

### Datasets (`/api/v1/datasets`)

| Method | Path | Description |
|---|---|---|
| POST | `/upload` | Upload dataset file (ClamAV scanned) |
| GET | `/` | List tenant datasets |
| GET | `/{id}` | Get dataset details |

### LLM (`/api/v1/llm`)

| Method | Path | Description |
|---|---|---|
| POST | `/query` | Send prompt to LLM |
| GET | `/history` | View query history |

### Analytics (`/api/v1/analytics`)

| Method | Path | Description |
|---|---|---|
| POST | `/profile/{dataset_id}` | Run column-level profiling |
| GET | `/profile/{dataset_id}` | Get existing profile results |
| POST | `/correlate/{dataset_id}` | Compute Pearson correlation matrix |
| POST | `/analyze/{dataset_id}` | Run comprehensive analysis |
| GET | `/report/{dataset_id}` | Get latest analysis report |
| POST | `/insights/{dataset_id}` | Generate AI-powered insights |
| GET | `/insights/{dataset_id}` | Get existing AI insights |
| GET | `/runs` | List analysis runs |
| GET | `/runs/{run_id}` | Get specific analysis run |

### Visualizations (`/api/v1/visualizations`)

| Method | Path | Description |
|---|---|---|
| POST | `/bar` | Bar chart data |
| POST | `/histogram` | Histogram data |
| POST | `/scatter` | Scatter plot data |
| POST | `/line` | Line chart data |
| POST | `/heatmap` | Correlation heatmap |
| POST | `/pie` | Pie chart data |
| POST | `/box` | Box plot data |
| POST | `/grouped-bar` | Grouped bar chart data |
| GET | `/preview/{dataset_id}` | Auto-detect best charts |

### Server-Side Charts (`/api/v1/charts`)

| Method | Path | Description |
|---|---|---|
| GET | `/png/bar/{dataset_id}` | Render bar chart as PNG |
| GET | `/png/histogram/{dataset_id}` | Render histogram as PNG |
| GET | `/png/scatter/{dataset_id}` | Render scatter plot as PNG |
| GET | `/png/heatmap/{dataset_id}` | Render heatmap as PNG |
| GET | `/png/pie/{dataset_id}` | Render pie chart as PNG |

### Database Connections (`/api/v1/db-connections`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List external DB connections |
| POST | `/` | Connect new read-only database |
| GET | `/{connection_id}/schema` | Introspect schema (tables + columns) |
| POST | `/{connection_id}/query` | Execute read-only query |

### Transforms (`/api/v1/transforms`)

| Method | Path | Description |
|---|---|---|
| POST | `/impute` | Impute missing values |
| POST | `/remove-outliers` | Remove outliers (IQR/Z-score) |
| POST | `/cast` | Cast column type |
| POST | `/filter` | Filter rows |
| POST | `/rename` | Rename column |
| POST | `/drop` | Drop columns |
| POST | `/normalize` | Normalize column |
| POST | `/encode` | One-hot encode |
| POST | `/apply` | Apply all transforms |
| GET | `/{dataset_id}` | List transforms |
| DELETE | `/{transform_id}` | Delete transform |

### Exports (`/api/v1/exports`)

| Method | Path | Description |
|---|---|---|
| GET | `/profile/{id}` | Export profile as CSV/Excel |
| GET | `/correlations/{id}` | Export correlations |
| GET | `/report/{id}` | Export analysis report |
| GET | `/insights/{id}` | Export AI insights |
| GET | `/dataset/{id}` | Download raw dataset |

### Admin (`/api/v1/admin`)

| Method | Path | Description |
|---|---|---|
| GET | `/users` | List all users (superuser) |
| GET | `/stats` | Platform stats |

## Frontend

- **Framework:** React 19 + TypeScript + Vite
- **UI:** Tailwind CSS v4 + shadcn/ui components
- **State:** Zustand (auth, datasets)
- **Routing:** React Router v7
- **HTTP:** Axios with JWT auto-refresh interceptors
- **Dev proxy:** `/api` requests proxied to `http://localhost:8000`

### Pages

| Route | Page | Description |
|---|---|---|
| `/login` | LoginPage | Email + password login |
| `/register` | RegisterPage | New account registration |
| `/forgot-password` | ForgotPasswordPage | Password reset request |
| `/` | DashboardPage | Overview with stats + quick actions |
| `/datasets` | DatasetsPage | Upload + manage datasets (drag & drop, progress bar) |
| `/analytics` | AnalyticsPage | Run profiling, correlation, full analysis |
| `/visualizations` | VisualizationsPage | Generate bar, histogram, scatter, pie, heatmap charts |
| `/transforms` | TransformsPage | Queue and apply data cleaning pipeline |
| `/llm` | LLMPage | Natural language queries with history |
| `/admin` | AdminPage | User management + platform stats (admin only) |

## Testing

```bash
cd backend

# run all tests (168 tests)
pytest tests/ -v

# run with coverage
pytest tests/ --cov=app --cov-report=term-missing -v

# run specific test file
pytest tests/test_auth.py -v
```

Tests use an in-memory SQLite database via `aiosqlite` — no external DB required.

### RLS Integration Tests (Docker required)

```bash
# run PostgreSQL RLS tests (7 tests, skip automatically without Docker)
pytest tests/test_pg_rls.py -v

# exclude RLS tests
pytest tests/ -v --ignore=tests/test_pg_rls.py
```

## Security

- **Password policy:** min 8 chars, requires upper, lower, digit, special
- **Email verification:** required before LLM queries
- **Rate limiting:** per-endpoint (login: 5/min, LLM: 30/min, general: 100/hr)
- **JWT expiry:** access 15min, refresh 7 days
- **HTTP security headers:** CSP, HSTS, X-Frame-Options, nosniff, etc.
- **CSRF:** Double-submit cookie pattern
- **Input validation:** SQL injection detection, HTML sanitization
- **File upload:** Extension whitelist + magic bytes + ClamAV scanning
- **Storage:** S3/MinIO with tenant-scoped buckets
- **Database:** PostgreSQL RLS for tenant isolation
- **Audit logging:** Database-backed audit trail for all events
- **PII redaction:** Post-query redaction of sensitive columns

See `docs/security/` for:
- OWASP Top 10 review
- Threat model
- Log redaction and alerting strategy

## Deployment

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Environment variables are loaded from `.env` (see `.env.example`). For production:
- Set `ENVIRONMENT=production`
- Use a strong `SECRET_KEY`
- Set `CLAMAV_ENABLED=true`
- Configure `STORAGE_BACKEND=s3` with MinIO/AWS S3
- Set `CORS_ORIGINS` to your frontend domain
- Configure SMTP for transactional emails
