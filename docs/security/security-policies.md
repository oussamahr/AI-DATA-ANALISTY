# Security Policies

**Version:** 1.0  
**Date:** 2026-07-14

---

## 1. Vulnerability Management

| Severity | Response Time | Patch Window |
|----------|--------------|--------------|
| Critical | Immediate | 24 hours |
| High | 4 hours | 7 days |
| Medium | 24 hours | 30 days |
| Low | 1 week | Next release |

### Process
1. Dependabot alerts reviewed within 24 hours
2. SAST (Bandit) findings reviewed before merge
3. Dependency scan (Safety) runs on every PR
4. Penetration test quarterly (third-party)

## 2. Incident Response Plan

### Detection
- Automated: WAF, IDS, anomaly detection on audit logs
- Manual: User reports, admin alerts
- CI/CD: Failed security checks block deployment

### Response Phases
1. **Triage** (15 min): Determine severity and affected systems
2. **Contain** (1 hour): Isolate affected component, revoke compromised credentials
3. **Eradicate** (4 hours): Apply patch, rotate secrets
4. **Recover** (24 hours): Restore from clean backup, verify integrity
5. **Post-mortem** (7 days): Root cause analysis, update threat model

### Communication
- Internal: #security Slack channel
- External: Status page, customer notification (if data breach)

## 3. Secrets Management

- No secrets in code: All secrets via environment variables
- Production secrets in HashiCorp Vault (or AWS Secrets Manager)
- JWT signing keys: RSA 4096-bit, rotated every 90 days
- Database passwords: Rotated every 90 days
- LLM API keys: Rotated every 30 days
- `.env` files: Never committed; `.env.example` is the template

## 4. Access Control

| Role | Access |
|------|--------|
| Anonymous | Login, Register |
| Verified User | Own data, own tenant data |
| Staff | User management, support tools |
| Superuser | Full system access (audited) |

- Principle of least privilege enforced at view level
- Tenant isolation enforced at query level
- All admin actions logged
- OIDC is the preferred production identity provider; local bearer auth remains available for development and test automation only.
- Cookie-backed sessions, when enabled, must use Redis as the session store and double-submit CSRF tokens.

## 5. Data Protection

- Encryption at rest: AES-256 (PostgreSQL `pgcrypto` for sensitive columns)
- Encryption in transit: TLS 1.2+
- PII: Masked in logs, redacted before LLM processing
- Backups: Encrypted, tested monthly
- Retention: Per data classification policy

## 6. Secure Development Lifecycle

- Pre-commit hooks: Bandit, detect-secrets, linting
- PR requirements:
  - Pass all CI checks (SAST, dependency scan, tests)
  - No secrets detected
  - Code review by at least one peer
- Threat model updated for every new feature
- Security review required for flows rated Critical/High

## 7. Compliance

- GDPR: Right to erasure, data portability, consent records
- CCPA: Data inventory, disclosure controls
- SOC 2: Audit logging, access reviews, incident response
