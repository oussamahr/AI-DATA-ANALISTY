# Implementation Plan: AI Data Analyst Backend Completion

## Executive Summary

This plan completes the AI Data Analyst backend security layers per the build prompt specification, with the frontend last. Total estimate: **~201 hours over 7 weeks**.

---

## STATUS — Completed Work (2026-07-15)

**161 backend tests passing, 7 RLS tests skipped (Docker unavailable)**
**Frontend builds successfully (Vite + React + TS)**

| Phase | Status | What was done |
|-------|--------|---------------|
| **1B: Security Fixes** | ✅ Complete | CSRF httponly=False, SQL injection + HTML validation wired to 16 endpoints, async audit log DB writes, body size limit middleware, cache-control headers, security middleware tests (6 tests) |
| **2B: Upload Security** | ✅ Complete | Magic byte verification, ClamAV scanner service, S3/MinIO storage, storage quota enforcement, row count/column defs extraction, upload security tests (28 tests) |
| **3: LLM Security** | ✅ Complete | Query intent schema, LLM structured output, query intent validator, query executor with cost limits, PII redactor, prompt injection prevention (system prompt + XML data tags + injection detection), LLM security tests (20 tests) |
| **4: PostgreSQL RLS** | ✅ Complete | RLS migration, tenant context middleware, RLS integration tests (7 tests, skip when no Docker) |
| **6B: OWASP Review** | ✅ Complete | OWASP Top 10 self-review doc, log redaction + alerting strategy doc |
| **7B: Logging** | ✅ Complete | Audit logs persisted to DB, structured logging |
| **2C: Email Service** | ✅ Complete | aiosmtplib-based email service |
| **Rate Limiting** | ✅ Complete | Redis-backed slowapi (per-user + per-IP, stricter on auth endpoints) |
| **CSV Injection Prevention** | ✅ Complete | Prefix dangerous leading chars (=, +, -, @) in all CSV exports |
| **Server-Side Charts** | ✅ Complete | Matplotlib PNG rendering (bar, histogram, scatter, heatmap, pie) |
| **DB Connector** | ✅ Complete | External PostgreSQL read-only connections, schema introspection, safe query execution |
| **5: Frontend** | ✅ Complete | Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Zustand + React Router + Axios. 10 pages: Login, Register, ForgotPassword, Dashboard, Datasets (upload w/ progress), Analytics, Visualizations, Transforms, LLM Query, Admin |
| **README** | ✅ Complete | Full rewrite with security features, architecture, endpoints, frontend docs |

### Files modified/created in this session

| File | Change |
|------|--------|
| `backend/app/services/dataset_service.py` | Added storage quota check, row count/column defs extraction, S3 + ClamAV |
| `backend/app/services/llm_service.py` | Added prompt injection prevention, system prompt, XML data tags, injection detection |
| `backend/app/services/query_executor.py` | Added MAX_ROWS (500k) and QUERY_TIMEOUT_SECONDS (30s) enforcement |
| `backend/tests/test_upload_security.py` | New — 28 tests for file validation, magic bytes, quotas, metadata extraction, ClamAV |
| `backend/tests/test_llm_security.py` | New — 20 tests for injection detection, sanitization, message building, cost limits |
| `backend/tests/test_pg_rls.py` | New — 7 RLS integration tests (skip when Docker unavailable) |
| `backend/app/core/security/rate_limiter.py` | New — RateLimitMiddleware using slowapi |
| `backend/app/services/chart_renderer.py` | New — Server-side matplotlib PNG chart rendering |
| `backend/app/api/v1/charts.py` | New — Chart rendering API endpoints (GET /png/bar, histogram, scatter, heatmap, pie) |
| `backend/app/models/db_connection.py` | New — DatabaseConnection model for external DB connections |
| `backend/app/services/db_connector_service.py` | New — External DB connector (read-only, schema introspection, safe query execution) |
| `backend/app/api/v1/db_connections.py` | New — DB connection API endpoints |
| `backend/app/schemas/db_connection.py` | New — Pydantic schemas for DB connection |
| `frontend/src/lib/api.ts` | New — Axios client with JWT auto-refresh interceptors |
| `frontend/src/lib/utils.ts` | New — cn() tailwind merge utility |
| `frontend/src/stores/authStore.ts` | New — Zustand auth state (login, register, logout, profile) |
| `frontend/src/stores/datasetStore.ts` | New — Zustand dataset state (list, upload, select) |
| `frontend/src/types/api.ts` | New — TypeScript interfaces for all API models |
| `frontend/src/components/layout/Navbar.tsx` | New — Navigation bar with auth dropdown |
| `frontend/src/components/layout/ProtectedRoute.tsx` | New — Auth guard for protected routes |
| `frontend/src/components/ui/*.tsx` | New — 12 shadcn/ui components (button, input, label, card, badge, dialog, select, separator, dropdown-menu, avatar, table, tabs, sonner) |
| `frontend/src/pages/LoginPage.tsx` | New — Login form |
| `frontend/src/pages/RegisterPage.tsx` | New — Registration form with email verification |
| `frontend/src/pages/ForgotPasswordPage.tsx` | New — Password reset request |
| `frontend/src/pages/DashboardPage.tsx` | New — Overview dashboard with stats + quick actions |
| `frontend/src/pages/DatasetsPage.tsx` | New — Dataset list + upload with drag & drop |
| `frontend/src/pages/AnalyticsPage.tsx` | New — Profile, correlate, full analysis |
| `frontend/src/pages/VisualizationsPage.tsx` | New — Chart generation (bar, histogram, scatter, pie, heatmap, box) |
| `frontend/src/pages/TransformsPage.tsx` | New — Transform pipeline builder |
| `frontend/src/pages/LLMPage.tsx` | New — AI query interface with history |
| `frontend/src/pages/AdminPage.tsx` | New — User management + platform stats |
| `frontend/src/App.tsx` | Updated — All routes with protected layout |
| `frontend/vite.config.ts` | Updated — Tailwind v4 plugin, path aliases, dev proxy |
| `frontend/tsconfig.app.json` | Updated — Path aliases for @/ imports |

---

**Key decisions incorporated:**
- Fresh Alembic migration for RLS (independent of schema)
- Environment-scoped S3 buckets (`ai-data-analyst-uploads-{env}`)
- ClamAV: required in staging/prod, optional with warning in dev
- Zustand for frontend state management
- Tailwind CSS + shadcn/ui for UI
- Real PostgreSQL for RLS tests, SQLite for unit tests
- Docker Compose (12-factor friendly) for now

---

## Phase 1B: Security Middleware Fixes (Critical - Week 1, ~16h)

**Goal:** Fix critical security issues before building other layers.

### Task 1B-1: Fix CSRF Cookie (1h)
- **File:** `backend/app/core/security/csrf.py:33-41`
- **Change:** Remove `httponly=True` from `set_csrf_cookie_headers()`. The double-submit cookie pattern requires JavaScript to read the CSRF cookie and set it as a header. With `httponly=True`, JavaScript cannot access the cookie, breaking CSRF protection.
- **Test:** Verify CSRF token is readable by JavaScript in browser tests.

### Task 1B-2: Wire SQL Injection Validator (3h)
- **Files:** `backend/app/api/v1/auth.py`, `backend/app/api/v1/tenants.py`, `backend/app/api/v1/roles.py`
- **Change:** Add `validate_no_sql_injection()` calls to user-facing input fields (email, name, role name, tenant name, etc.)
- **Pattern:**
  ```python
  from app.core.security.validators import validate_no_sql_injection
  validate_no_sql_injection(data.email)
  ```

### Task 1B-3: Wire HTML Validator (2h)
- **Files:** `backend/app/api/v1/datasets.py`, `backend/app/api/v1/transforms.py`
- **Change:** Add `validate_no_html()` to description fields and user-provided text inputs.

### Task 1B-4: Persist Audit Logs to Database (3h)
- **File:** `backend/app/core/security/audit.py`
- **Change:** After logging to Python logger, also insert into `AuditLog` model. The model already exists but is unused.
- **Pattern:**
  ```python
  async def log_to_db(self, session, action, resource_type, resource_id, actor_id, tenant_id, ...):
      entry = AuditLog(action=action, resource_type=resource_type, ...)
      session.add(entry)
  ```

### Task 1B-5: Request Body Size Limits (2h)
- **File:** `backend/app/core/security/middleware.py`
- **Change:** Add middleware that rejects requests with `Content-Length` exceeding a configurable limit (default 10MB for JSON, 100MB for multipart).

### Task 1B-6: Cache-Control Headers (1h)
- **File:** `backend/app/core/security/middleware.py`
- **Change:** Add `Cache-Control: no-store, no-cache, must-revalidate` and `Pragma: no-cache` headers to all API responses.

### Task 1B-7: Security Middleware Tests (4h)
- **File:** `backend/tests/test_security_middleware.py` (new)
- **Tests:**
  - CSRF validation blocks unsafe methods without token
  - Security headers present on all responses
  - SQL injection patterns blocked on input endpoints
  - HTML tags blocked on description fields
  - Audit logs persisted to database
  - Request body size limits enforced

---

## Phase 2B: Data Ingestion Security (Critical - Week 1-2, ~33h)

**Goal:** Complete file upload security with ClamAV, S3/MinIO, and magic byte verification.

### Task 2B-1: Add Magic Byte Verification (2h)
- **File:** `backend/app/core/security/validators.py`
- **Change:** Add `validate_magic_bytes(content, filename)` function that checks file content against expected signatures.
- **Signatures:**
  - `.csv/.tsv/.json`: Verify valid UTF-8/ASCII text
  - `.xlsx`: `PK` (ZIP archive)
  - `.xls`: `\xd0\xcf\x11\xe0` (OLE2)
  - `.parquet`: `PAR1`
  - `.feather`: `FEA1`
- **Dependency:** Add `python-magic==0.4.27` to `requirements.txt`

### Task 2B-2: Add ClamAV to Docker Compose (2h)
- **File:** `docker/docker-compose.yml`
- **Add:**
  ```yaml
  clamav:
    image: clamav/clamav:stable
    ports:
      - "3310:3310"
    volumes:
      - clamav_db:/var/lib/clamav
    environment:
      - CLAMD_CONF_MaxFileSize=100M
      - CLAMD_CONF_StreamMaxLength=100M
    healthcheck:
      test: ["CMD", "/usr/local/bin/clamdcheck.sh"]
      interval: 60s
      retries: 3
      start_period: 120s
    deploy:
      resources:
        limits:
          memory: 2G
  ```

### Task 2B-3: Create ClamAV Scanner Service (4h)
- **File:** `backend/app/core/security/clamav.py` (new)
- **Features:**
  - `VirusScanService` class with `scan_bytes()` method
  - Configurable via `CLAMD_HOST` and `CLAMD_PORT` env vars
  - Graceful fallback: if ClamAV unavailable in dev mode, log warning and skip
  - Required in staging/prod (fail closed if unreachable)
  - Connection retry logic with exponential backoff

### Task 2B-4: Integrate ClamAV into Upload Flow (3h)
- **File:** `backend/app/services/dataset_service.py`
- **Change:** Insert scan after `file.read()`, before storage write
- **Flow:**
  ```python
  content = await file.read()
  validate_magic_bytes(content, file.filename)
  await scan_upload(content, settings)  # ClamAV scan
  await storage.put(storage_key, content, detected_mime)
  ```

### Task 2B-5: Add MinIO to Docker Compose (2h)
- **File:** `docker/docker-compose.yml`
- **Add:**
  ```yaml
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
  ```

### Task 2B-6: Create S3 Storage Service (6h)
- **File:** `backend/app/core/storage.py` (new)
- **Classes:**
  - `BaseStorage` (abstract): `put()`, `get()`, `delete()`, `get_presigned_url()`
  - `LocalStorage(BaseStorage)`: Current behavior
  - `S3Storage(BaseStorage)`: Uses `aioboto3` for async S3/MinIO operations
  - `get_storage()` factory: Returns appropriate backend based on `STORAGE_BACKEND` config
- **Config additions to `backend/app/core/config.py`:**
  ```python
  S3_ENDPOINT_URL: str = ""
  S3_ACCESS_KEY: str = ""
  S3_SECRET_KEY: str = ""
  S3_BUCKET_NAME: str = "ai-data-analyst-uploads-dev"
  S3_REGION: str = "us-east-1"
  STORAGE_BACKEND: str = "local"  # "local" | "s3"
  CLAMD_HOST: str = "clamav"
  CLAMD_PORT: int = 3310
  CLAMAV_SCAN_REQUIRED: bool = True  # False in dev
  ```

### Task 2B-7: Refactor Dataset Service for S3 (4h)
- **File:** `backend/app/services/dataset_service.py`
- **Changes:**
  - Replace `aiofiles` writes with `storage.put()`
  - `Dataset.file_path` stores S3 key instead of local path
  - Update `DatasetResponse` to not expose internal paths

### Task 2B-8: Update Downstream Consumers (4h)
- **Files:** All services that call `_load_dataframe()`:
  - `backend/app/services/analytics_service.py`
  - `backend/app/services/ai_analytics_service.py`
  - `backend/app/services/export_service.py`
  - `backend/app/services/transform_service.py`
  - `backend/app/services/visualization_service.py`
- **Pattern:** Make `_load_dataframe()` async, download from storage to temp file, read with pandas, clean up temp file.

### Task 2B-9: Fix File Size Validation (2h)
- **File:** `backend/app/core/security/validators.py`, `backend/app/services/dataset_service.py`
- **Change:** Single-pass validation: read file once, validate size, then process.

### Task 2B-10: Enforce Storage Quota (2h)
- **File:** `backend/app/services/dataset_service.py`
- **Change:** Check `Tenant.storage_quota_bytes` before upload. Query current usage, add new file size, reject if over quota.

### Task 2B-11: Set Row Count/Column Definitions During Upload (2h)
- **File:** `backend/app/services/dataset_service.py`
- **Change:** After storage write, use pandas to read first chunk and set `row_count` and `column_definitions`.

### Task 2B-12: Upload Security Tests (4h)
- **File:** `backend/tests/test_upload_security.py` (new)
- **Tests:**
  - Magic byte verification catches renamed executables
  - ClamAV scan blocks infected files (mock clamd)
  - Storage quota enforcement
  - S3 upload/download roundtrip (mock S3)
  - File size limits enforced

---

## Phase 3: LLM Query Layer Security (Critical - Week 2-3, ~45h)

**Goal:** Implement secure LLM query pipeline with structured output.

### Task 3-1: Define Query Intent Schema (3h)
- **File:** `backend/app/schemas/llm.py`
- **Add:**
  ```python
  class FilterClause(BaseModel):
      column: str
      operator: Literal["=", ">", "<", ">=", "<=", "!="]
      value: str | int | float | None

  class QueryIntent(BaseModel):
      table_name: str  # Will be validated against allowed tables
      columns: list[str]
      filters: list[FilterClause]
      aggregations: list[AggregationClause] | None = None
      order_by: str | None = None
      order_direction: Literal["asc", "desc"] = "asc"
      limit: int = Field(ge=1, le=10000, default=100)
      error: str | None = None  # Model can signal inability to fulfill
  ```

### Task 3-2: Implement LLM Structured Output (6h)
- **File:** `backend/app/services/llm_service.py`
- **Changes:**
  - Use `client.chat.completions.parse()` with `response_format=QueryIntent`
  - System prompt includes: allowed tables, columns, safety rules
  - Handle `parsed == None` (model refusal) as first-class error
  - Calculate `LLMQuery.cost` from token counts
  - Populate `LLMQuery.prompt_redacted`

### Task 3-3: Build Query Intent Validator (8h)
- **File:** `backend/app/core/security/query_validator.py` (new)
- **Features:**
  - `validate_query_intent(intent, user_permissions)` - checks tables/columns against user's RBAC permissions
  - Whitelist-based validation (not denylist)
  - Bounded limits (max rows, max filters)
  - Pattern detection for injection attempts

### Task 3-4: Implement Query Executor (8h)
- **File:** `backend/app/services/query_executor.py` (new)
- **Features:**
  - Translates validated `QueryIntent` to SQLAlchemy Core (parameterized)
  - `EXPLAIN` dry-run for cost estimation
  - Query timeout enforcement
  - Row limit enforcement
  - Returns results as list of dicts

### Task 3-5: Post-Query Redaction (4h)
- **File:** `backend/app/core/security/redaction.py` (new)
- **Features:**
  - `redact_sensitive_columns(results, user_permissions)` - strips columns marked sensitive in metadata
  - Applied after query execution, before returning to user/LLM

### Task 3-6: Prompt Injection Prevention (4h)
- **File:** `backend/app/services/llm_service.py`
- **Change:** When data flows back into LLM context (e.g., summarization), sanitize/delimit clearly:
  - Wrap data in `<data>` tags
  - Instruct LLM to treat data as untrusted
  - Limit data sample size

### Task 3-7: Query Cost Limits (3h)
- **File:** `backend/app/services/query_executor.py`
- **Features:**
  - Max rows returned (configurable, default 10000)
  - Query timeout (configurable, default 30s)
  - Token budget for LLM prompts

### Task 3-8-10: Minor Fixes (3h total)
- Calculate cost from tokens, populate prompt_redacted, wire dataset_id from API

### Task 3-11: LLM Security Tests (6h)
- **File:** `backend/tests/test_llm_security.py` (new)
- **Tests:**
  - Structured output conforms to schema
  - Query validator rejects unauthorized tables/columns
  - Query executor uses parameterized queries
  - Sensitive columns redacted after query
  - Prompt injection patterns detected and blocked
  - Query timeout enforced
  - Row limits enforced

---

## Phase 4: PostgreSQL RLS (Critical - Week 3, ~20h)

**Goal:** Implement database-level multi-tenant isolation.

### Task 4-1: Create Alembic Migration for RLS (4h)
- **File:** `backend/alembic/versions/001_add_rls.py` (new)
- **Content:**
  ```sql
  -- Create limited application role
  CREATE ROLE app_user NOLOGIN;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

  -- Enable RLS on tenant-scoped tables
  ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE datasets FORCE ROW LEVEL SECURITY;
  ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
  ALTER TABLE data_transforms ENABLE ROW LEVEL SECURITY;
  ALTER TABLE llm_queries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

  -- Create policies
  CREATE POLICY datasets_tenant_isolation ON datasets
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  -- ... similar for other tables
  ```

### Task 4-2: Create PostgreSQL App Role (2h)
- **File:** `backend/alembic/versions/001_add_rls.py`
- **Change:** Create `app_user` role with limited permissions (not superuser).

### Task 4-3: Define RLS Policies (4h)
- **File:** `backend/alembic/versions/001_add_rls.py`
- **Tables to protect:** datasets, analysis_runs, analysis_results, data_transforms, llm_queries, audit_logs

### Task 4-4: Implement Tenant Context Injection (3h)
- **File:** `backend/app/core/database.py`
- **Add:**
  ```python
  from contextvars import ContextVar

  current_tenant_id: ContextVar[str | None] = ContextVar("current_tenant_id", default=None)

  @event.listens_for(engine.sync_engine, "connect")
  def _reset_tenant_context(dbapi_conn, connection_record):
      cursor = dbapi_conn.cursor()
      cursor.execute("SET app.current_tenant_id = ''")
      cursor.close()
  ```

### Task 4-5: Connection Pool Reset Handler (2h)
- **File:** `backend/app/core/database.py`
- **Change:** Reset `app.current_tenant_id` on connection checkout to prevent leakage.

### Task 4-6: Update Database URL (1h)
- **Files:** `.env.example`, `backend/app/core/config.py`
- **Change:** Use `app_user` role instead of `postgres` superuser.

### Task 4-7: RLS Tests (4h)
- **File:** `backend/tests/test_pg_rls.py` (new)
- **Setup:** `testcontainers[postgres]` for real PostgreSQL in tests
- **Tests:**
  - Tenant A cannot see Tenant B's datasets
  - Cross-tenant INSERT blocked
  - Cross-tenant UPDATE blocked
  - Cross-tenant DELETE blocked
  - Admin bypass works correctly
- **Marker:** `@pytest.mark.pg` (requires Docker)

---

## Phase 6B: Enhanced Security Pipeline (Medium - Week 3-4, ~12h)

### Task 6B-1: OWASP ZAP DAST Scanning (4h)
- **File:** `.github/workflows/security.yml`
- **Add:** ZAP baseline scan against staging deployment

### Task 6B-2: Semgrep Custom Rules (2h)
- **File:** `.github/workflows/security.yml`
- **Add:** Custom rules for SQL injection patterns, hardcoded secrets

### Task 6B-3: OWASP Top 10 Self-Review (4h)
- **File:** `docs/security/owasp-top10-review.md` (new)
- **Document:** How each OWASP Top 10 category is addressed

### Task 6B-4: Credential Rotation Docs (2h)
- **File:** `docs/security/credential-rotation.md` (new)
- **Document:** Rotation schedule for DB creds, API keys, secrets

---

## Phase 7B: Logging & Monitoring (Medium - Week 4, ~7h)

### Task 7B-1: Log Redaction Middleware (3h)
- **File:** `backend/app/core/security/middleware.py`
- **Change:** Strip `password`, `token`, `authorization` fields from logs

### Task 7B-2: Alerting Configuration (2h)
- **File:** `docs/security/alerting.md` (new)
- **Document:** Alert rules for anomalous patterns

### Task 7B-3: Security Event Logging (2h)
- **File:** `backend/app/core/security/audit.py`
- **Change:** Ensure all security events (auth failures, authz denials) are logged with structured JSON

---

## Phase 2C: Email Service (Low - Week 4, ~8h)

### Task 2C-1: Create Email Service (4h)
- **File:** `backend/app/services/email_service.py` (new)
- **Features:** SMTP support, HTML/text templates, async sending

### Task 2C-2: Wire to Auth Flows (2h)
- **File:** `backend/app/services/auth_service.py`
- **Change:** Send verification and password reset emails

### Task 2C-3: Email Tests (2h)
- **File:** `backend/tests/test_email.py` (new)

---

## Phase 5: Frontend (Last - Week 4-7, ~60h)

**Stack:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand

### Task 5-1: Scaffold Project (4h)
- Create Vite + React + TypeScript project
- Install Tailwind CSS, shadcn/ui, Zustand, React Router
- Set up API client with auth interceptors

### Task 5-2: Authentication UI (8h)
- Login/Register forms
- OIDC SSO button
- Email verification flow
- Password reset flow
- Protected route wrapper

### Task 5-3: Dataset Management (6h)
- Upload dropzone with progress
- Dataset list with search/filter
- Dataset detail view
- Storage usage indicator

### Task 5-4: Analytics Dashboard (8h)
- Column profiling results
- Correlation matrix heatmap
- AI insights display
- Analysis run history

### Task 5-5: Visualization Components (8h)
- Chart.js or Recharts integration
- Bar, histogram, scatter, line, heatmap, pie, box charts
- Auto-preview for uploaded datasets
- Export charts as images

### Task 5-6: LLM Query Interface (6h)
- Chat-style query input
- Structured results display
- Query history
- Context selector (which dataset to query)

### Task 5-7: Data Transformation UI (6h)
- Transform recipe builder
- Preview before apply
- Undo/reorder transforms
- Apply pipeline button

### Task 5-8: Export Functionality (4h)
- Export buttons (CSV/Excel)
- Download progress
- Export history

### Task 5-9: Admin Panel (6h)
- User management
- Role management
- Tenant management
- Platform stats

### Task 5-10: Security & CSP (4h)
- Strict CSP headers
- XSS protection testing
- CSRF token handling

---

## Summary Table

| Phase | Priority | Hours | Key Files |
|-------|----------|-------|-----------|
| **1B: Security Fixes** | Critical | 16h | csrf.py, middleware.py, audit.py |
| **2B: Upload Security** | Critical | 33h | storage.py, clamav.py, dataset_service.py |
| **3: LLM Security** | Critical | 45h | llm_service.py, query_validator.py, query_executor.py |
| **4: PostgreSQL RLS** | Critical | 20h | database.py, alembic migrations |
| **6B: CI/CD Security** | Medium | 12h | security.yml, owasp-top10-review.md |
| **7B: Logging** | Medium | 7h | middleware.py, audit.py |
| **2C: Email Service** | Low | 8h | email_service.py |
| **5: Frontend** | Last | 60h | React + Vite + Tailwind |
| **Total** | | **201h** | |

---

## New Dependencies

```txt
# Phase 2B: Upload Security
aioboto3>=13.0.0        # Async S3/MinIO client
clamd>=1.0.2            # Async ClamAV client
python-magic>=0.4.27    # MIME type detection

# Phase 4: RLS Testing
testcontainers[postgres]>=4.0.0  # PostgreSQL test container
```

---

## OpenAI Structured Output Implementation

```python
# Example QueryIntent schema
class QueryIntent(BaseModel):
    table_name: Literal["orders", "users", "products"]  # strict whitelist
    columns: list[Literal["id", "status", "created_at", "email", "name"]]
    filters: list[FilterClause]
    order_by: Literal["asc", "desc"]
    limit: int = Field(ge=1, le=10000, default=100)
    error: str | None = None  # model can signal it cannot fulfill the request

# Usage with OpenAI
completion = client.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[...],
    response_format=QueryIntent,
)
intent = completion.choices[0].message.parsed
```

---

## S3/MinIO Storage Configuration

```yaml
# docker-compose.yml addition
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
  ports:
    - "9000:9000"
    - "9001:9001"
  volumes:
    - minio_data:/data
```

---

## PostgreSQL RLS Policy Example

```sql
-- Alembic migration
CREATE POLICY datasets_tenant_isolation ON datasets
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

## ClamAV Docker Configuration

```yaml
# docker-compose.yml addition
clamav:
  image: clamav/clamav:stable
  ports:
    - "3310:3310"
  volumes:
    - clamav_db:/var/lib/clamav
  environment:
    - CLAMD_CONF_MaxFileSize=100M
    - CLAMD_CONF_StreamMaxLength=100M
  healthcheck:
    test: ["CMD", "/usr/local/bin/clamdcheck.sh"]
    interval: 60s
    retries: 3
    start_period: 120s
  deploy:
    resources:
      limits:
        memory: 2G
```

---

## Testing Strategy

- **SQLite:** Fast unit tests for pure business logic (no RLS)
- **PostgreSQL:** Real database tests for RLS/security via `testcontainers`
- **Markers:** `@pytest.mark.pg` for PostgreSQL-specific tests
- **Run commands:**
  ```bash
  # Fast tests only (SQLite):
  pytest tests/ -m "not pg"

  # PostgreSQL RLS tests only:
  pytest tests/ -m pg

  # All tests:
  pytest tests/
  ```

---

## Deployment

- **Docker Compose** for now (12-factor friendly)
- **No Kubernetes/ECS** yet (premature infra complexity)
- **Environment variables** for all config (no hardcoded paths/ports)
- **Secrets** never baked into images

---

*Plan created: 2026-07-15*
*Total estimate: ~201 hours over 7 weeks*
