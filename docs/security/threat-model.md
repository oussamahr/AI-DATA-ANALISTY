# Threat Model - AI Data Analytics Platform

**Version:** 1.1
**Date:** 2026-07-15
**Owner:** Engineering / Security Review
**Methodology:** STRIDE per data flow

## Trust Boundaries

```text
[Browser] -> [Reverse Proxy / TLS termination] -> [FastAPI BFF]
                                               -> [Redis]
                                               -> [PostgreSQL]
                                               -> [LLM Provider API]
                                               -> [Object Storage]
```

| Boundary | Description |
| --- | --- |
| T1 | Browser to proxy: unauthenticated internet traffic |
| T2 | Proxy to FastAPI: bearer-token or session-cookie requests |
| T3 | FastAPI to Redis/Postgres/Object Storage: internal service traffic |
| T4 | FastAPI to LLM provider: outbound third-party API calls |

## Data Flow 1: Authentication

```text
User -> POST /api/v1/auth/login -> FastAPI -> DB lookup -> JWT or session cookie -> User
User -> POST /api/v1/auth/refresh -> FastAPI -> token validation -> new JWT -> User
User -> OIDC bearer token -> FastAPI -> JWKS verification -> local user mapping
```

| Category | Threat | Risk | Mitigation |
| --- | --- | --- | --- |
| S | Credential stuffing or stolen identity tokens | High | OIDC preferred in production, local auth rate-limited in development |
| S | JWT forgery or replay | Critical | Verify signature, issuer, audience, expiry, and token type |
| T | Token tampering in transit | High | HTTPS only, HSTS, reverse proxy TLS termination |
| R | User disputes sign-in or logout activity | Medium | Structured audit logging for login/logout/failed attempts |
| I | Error messages reveal account existence | Medium | Generic client errors only |
| D | Brute-force or password spraying | High | Per-user and per-IP rate limiting, progressive backoff |
| E | Client attempts privilege escalation | Critical | Server-side role checks only; client state is never authoritative |

## Data Flow 2: Tenant Data Access

```text
User -> dataset/analytics/export routes -> FastAPI -> authorization checks -> Postgres rows/columns
```

| Category | Threat | Risk | Mitigation |
| --- | --- | --- | --- |
| S | Cross-tenant access using valid credentials | Critical | Tenant context derived from server-side identity, not request body |
| T | Query intent tampering | High | Validate requested tables/columns before SQL generation |
| R | Tenant denies a destructive action | Medium | Audit actor, tenant, route, and resource identifiers |
| I | Sensitive column leakage | Critical | Column allowlists and post-query redaction |
| D | Expensive query abuse | High | Row limits, timeouts, and per-user rate limiting |
| E | Accessing admin-only resources | Critical | Explicit authorization dependency on every protected route |

## Data Flow 3: File Uploads

```text
User -> upload endpoint -> file validation -> antivirus scan -> object storage -> ingestion
```

| Category | Threat | Risk | Mitigation |
| --- | --- | --- | --- |
| S | Malicious user uploads disguised content | High | Magic-byte verification, allowlisted MIME types |
| T | Path traversal or filename injection | High | Randomized storage names, never trust user filenames |
| R | User disputes upload provenance | Medium | Audit the upload actor and request metadata |
| I | Upload contains sensitive data | High | Store outside web root, classify data, restrict access |
| D | Oversized uploads exhaust storage or memory | High | Max file size and streaming validation |
| E | Uploaded content triggers unintended code paths | High | Antivirus scan and content validation before processing |

## Data Flow 4: LLM Prompting and Query Generation

```text
User question + permitted schema metadata -> LLM -> structured query intent -> validator -> SQLAlchemy Core -> DB
```

| Category | Threat | Risk | Mitigation |
| --- | --- | --- | --- |
| S | Prompt injection impersonates the system | High | Separate system instructions from user content |
| T | Raw SQL injection through model output | Critical | LLM may only emit structured JSON intent; no raw SQL execution |
| R | User disputes query execution | Medium | Log query shape, requesting user, and tenant |
| I | Unredacted data returns to model context | High | Sanitize delimiters and redact sensitive columns before reuse |
| D | Cost exhaustion via large queries or prompts | High | Token limits, row caps, and query timeouts |
| E | Query touches tables or columns outside role scope | Critical | Validate query intent against permissions before translation |

## Data Flow 5: Sessions and CSRF

```text
Browser session cookie -> FastAPI -> Redis session lookup -> CSRF token validation
```

| Category | Threat | Risk | Mitigation |
| --- | --- | --- | --- |
| S | Session hijacking | High | HttpOnly, Secure, SameSite=Strict cookies and session rotation on login |
| T | CSRF on cookie-authenticated requests | High | Double-submit CSRF tokens on unsafe methods |
| R | User denies session activity | Medium | Audit login, logout, session revoke, and authz denial events |
| I | Session identifiers leak into logs | High | Redaction on auth and request logs |
| D | Session store exhaustion | Medium | TTL-based cleanup and rate limiting |
| E | Session reuse across tenant or role changes | High | Session invalidation on auth changes and absolute timeout |

## Residual Risks

- LLM output can still be misleading even when structurally valid.
- Third-party providers remain a dependency for authentication and LLM use.
- Security controls must be re-reviewed whenever new data sources, roles, or exports are added.
