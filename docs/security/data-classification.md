# Data Classification Policy

**Version:** 1.0  
**Date:** 2026-07-14  
**Classification Levels:** Public, Internal, Confidential, Restricted

---

## Classification Levels

| Level | Tag | Definition | Examples |
|-------|-----|------------|----------|
| **Public** | `PUB` | No harm if disclosed; intended for public consumption | Blog content, landing page, marketing copy, OpenAPI schema |
| **Internal** | `INT` | Limited harm if disclosed; not intended for public | Aggregated analytics, non-sensitive dashboard data, internal docs |
| **Confidential** | `CONF` | Significant harm if disclosed; business-sensitive | User datasets, LLM prompts & responses, tenant configuration, API keys |
| **Restricted** | `REST` | Severe harm if disclosed; regulated/PII | User emails, passwords (hashed), encryption keys, audit logs |

---

## Data Inventory & Classification

### User Data (`accounts`)

| Field | Classification | Rationale | Controls |
|-------|---------------|-----------|----------|
| `id` (UUID) | Internal | Not public but not sensitive individually | JWT auth required |
| `email` | **Restricted** | PII — regulated under GDPR/CCPA | Encrypted at rest; never logged; never in URLs |
| `password` (hash) | **Restricted** | Credential material | Argon2/bcrypt hashing; never stored in plaintext; never logged |
| `first_name` / `last_name` | Confidential | Personal data | Access control; masked in logs |
| `avatar` | Confidential | Personal image | Signed URLs; access control |
| `is_verified` | Internal | Account state | No special handling |
| `created_at` / `updated_at` | Internal | Metadata | No special handling |

### Dataset Data (`datasets`)

| Field | Classification | Rationale | Controls |
|-------|---------------|-----------|----------|
| Dataset file content | **Confidential** (default) | User's business data | Encryption at rest; access control; PII scanning on upload |
| Dataset metadata (name, desc) | Internal | Not sensitive | Standard access control |
| Column definitions | Internal | Schema info | Standard access control |
| Upload timestamps | Internal | Metadata | No special handling |
| Datasets marked as containing PII | **Restricted** | Regulated data | Column-level encryption; limited access; data retention policy |

### LLM Data (`llm`)

| Field | Classification | Rationale | Controls |
|-------|---------------|-----------|----------|
| User prompt | **Confidential** | May contain business secrets or PII | PII redaction before sending to LLM; audit logged |
| LLM response | **Confidential** | Derivative of user's data | Audit logged; not cached beyond session |
| System prompt template | Internal | Not secret but controlled | Version-controlled; not user-facing |
| Token usage / cost | Internal | Billing data | Access control |
| LLM API keys | **Restricted** | Credential material | Environment variable; never in code; never in logs |

### Audit Data (`audit`)

| Field | Classification | Rationale | Controls |
|-------|---------------|-----------|----------|
| Event type / action | Internal | Operational data | Append-only |
| Actor (user ID) | Confidential | User action mapping | Access control on audit viewer |
| Target (resource ID) | Confidential | Resource reference | Access control |
| Changed fields / diff | **Restricted** | May contain PII | Masked before storage; retention limit |
| IP address | **Restricted** | PII under GDPR | Retention limit; masked after 90 days |
| Timestamp | Internal | Sequence info | No special handling |

### Tenant Data (`tenants`)

| Field | Classification | Rationale | Controls |
|-------|---------------|-----------|----------|
| Tenant name / domain | Internal | Business identity | Standard access control |
| Billing info | **Restricted** | Financial/PII | Encryption at rest; limited access |
| Feature flags | Internal | Configuration | Standard access control |
| Storage quotas | Internal | Resource limits | No special handling |

### System / Configuration

| Field | Classification | Rationale | Controls |
|-------|---------------|-----------|----------|
| `SECRET_KEY` | **Restricted** | Django signing key | Environment variable; rotated quarterly |
| Database credentials | **Restricted** | Infrastructure secrets | Environment variable; separate DB user per environment |
| JWT signing key | **Restricted** | Authentication key | RS256 key pair; private key never in repo |
| LLM API keys | **Restricted** | Third-party credentials | Environment variable; vault in production |

---

## Data Handling Requirements

| Action | Public | Internal | Confidential | Restricted |
|--------|--------|----------|--------------|------------|
| **Storage** | No encryption required | Standard encryption at rest | AES-256 at rest | AES-256 at rest + column-level encryption |
| **Transit** | HTTPS recommended | HTTPS required | HTTPS required + HSTS | HTTPS required + HSTS + mutual TLS |
| **Logging** | Allowed | Allowed | Masked or excluded | Never logged |
| **Caching** | Allowed | Allowed with auth | Authenticated cache only | Never cached |
| **External sharing** | Unlimited | NDA required | DPA required + approval | Prohibited |
| **Retention** | Indefinite | Per business need | Max 3 years (configurable) | Max 1 year or legal minimum |
| **Backup encryption** | Optional | Recommended | Required | Required + access audit |
| **Anonymization for dev/test** | N/A | N/A | Required | Required + synthetic data preferred |

---

## Implementation Checklist

- [ ] Add `data_classification` attribute to all model fields via custom Django field or decorator
- [ ] Create PII scanner for dataset uploads (regex + ML-based)
- [ ] Add PII redaction middleware for LLM prompts
- [ ] Implement masking in audit log for Restricted fields
- [ ] Configure encryption at rest (PostgreSQL `pgcrypto` or application-level)
- [ ] Add classification tagging to OpenAPI schema responses
- [ ] Enforce classification-based cache headers
- [ ] Document data retention in privacy policy
