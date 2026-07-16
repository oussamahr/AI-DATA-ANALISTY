# Log Redaction and Alerting Strategy

## Log Redaction

### Sensitive Data Patterns

The following patterns are automatically redacted from logs:

| Pattern | Example | Redacted As |
|---------|---------|-------------|
| Email addresses | user@example.com | [EMAIL_REDACTED] |
| Phone numbers | 555-123-4567 | [PHONE_REDACTED] |
| SSN | 123-45-6789 | [SSN_REDACTED] |
| Credit cards | 4111-1111-1111-1111 | [CARD_REDACTED] |
| IP addresses | 192.168.1.1 | [IP_REDACTED] |
| API keys | sk_live_abc123... | [API_KEY_REDACTED] |
| Passwords | •••••••• | [REDACTED] |

### Implementation

#### Backend Redaction

```python
# In app/core/security/redaction.py

import re

REDACTION_PATTERNS = {
    "email": (r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[EMAIL_REDACTED]"),
    "phone": (r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[PHONE_REDACTED]"),
    "ssn": (r"\b\d{3}[-]?\d{2}[-]?\d{4}\b", "[SSN_REDACTED]"),
    "credit_card": (r"\b\d{4}[-]?\d{4}[-]?\d{4}[-]?\d{4}\b", "[CARD_REDACTED]"),
    "ip_address": (r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", "[IP_REDACTED]"),
}

class LogRedactor:
    def __init__(self):
        self.patterns = {name: re.compile(pattern) for name, (pattern, _) in REDACTION_PATTERNS.items()}
        self.replacements = {name: replacement for name, (_, replacement) in REDACTION_PATTERNS.items()}
    
    def redact(self, message: str) -> str:
        for name, pattern in self.patterns.items():
            message = pattern.sub(self.replacements[name], message)
        return message

redactor = LogRedactor()
```

#### Middleware Integration

```python
# In app/core/security/middleware.py

class LogRedactionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Redact sensitive data from response headers
        for header in response.headers:
            if header.lower() in SENSITIVE_HEADERS:
                response.headers[header] = "[REDACTED]"
        
        return response
```

### Log Levels and Redaction

| Level | Redaction | Use Case |
|-------|-----------|----------|
| DEBUG | None | Development only |
| INFO | Basic PII | Normal operations |
| WARNING | Full PII | Security events |
| ERROR | Full PII + Stack | Error tracking |
| CRITICAL | Full PII + Context | Security incidents |

## Alerting Strategy

### Alert Categories

#### 1. Authentication Alerts

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Failed login attempts | 5+ in 5 min | HIGH | Block IP, notify admin |
| Account lockout | 3 lockouts/day | CRITICAL | Disable account, notify |
| Password reset requests | 3+ in 1 hour | MEDIUM | Log, notify user |
| Session anomalies | Impossible travel | HIGH | Terminate session |

#### 2. Authorization Alerts

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Unauthorized access attempts | 10+ in 10 min | CRITICAL | Block user, notify |
| RBAC escalation attempts | Any attempt | HIGH | Log, notify admin |
| Tenant isolation violations | Any attempt | CRITICAL | Block, investigate |

#### 3. Data Security Alerts

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Malware detected | Any detection | CRITICAL | Quarantine, notify |
| Large data exfiltration | >10MB in 1 hour | HIGH | Block, notify |
| Unusual download patterns | 2x normal | MEDIUM | Log, review |
| PII access anomalies | Unusual patterns | HIGH | Log, investigate |

#### 4. System Security Alerts

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| SQL injection attempts | Any detection | CRITICAL | Block IP, notify |
| XSS attempts | Any detection | HIGH | Block, notify |
| API rate limit exceeded | 3+ blocks/hour | MEDIUM | Log, review |
| Unusual API patterns | Anomaly detected | MEDIUM | Log, investigate |

### Alert Configuration

```yaml
# In config/alerts.yml

alerts:
  authentication:
    failed_login:
      threshold: 5
      window: 300  # 5 minutes
      action: block_ip
      notification:
        - email: admin@example.com
        - slack: #security-alerts
    
    account_lockout:
      threshold: 3
      window: 86400  # 24 hours
      action: disable_account
      notification:
        - email: admin@example.com
        - pagerduty: security-team
  
  data_security:
    malware_detected:
      threshold: 1
      window: 0  # immediate
      action: quarantine
      notification:
        - email: security@example.com
        - slack: #security-incidents
        - pagerduty: security-team
```

### Notification Channels

1. **Email**: For non-urgent alerts and reports
2. **Slack**: For real-time team notifications
3. **PagerDuty**: For critical incidents requiring immediate response
4. **Webhook**: For custom integrations

### Incident Response

#### Severity Levels

| Level | Response Time | Escalation | Examples |
|-------|---------------|------------|----------|
| LOW | 24 hours | None | Failed validation |
| MEDIUM | 4 hours | Team lead | Rate limiting |
| HIGH | 1 hour | Security team | Unauthorized access |
| CRITICAL | 15 minutes | Management | Data breach |

#### Response Procedures

1. **Detection**: Automated alerting system
2. **Triage**: Assess severity and impact
3. **Containment**: Block threats, isolate systems
4. **Eradication**: Remove threat, patch vulnerabilities
5. **Recovery**: Restore systems, verify integrity
6. **Lessons Learned**: Post-incident review

### Monitoring Dashboards

#### Security Dashboard Metrics

- Failed authentication attempts (real-time)
- Active sessions by user/tenant
- API request patterns
- File upload activity
- Error rates by endpoint
- Geographic access patterns

#### Compliance Dashboard Metrics

- Audit log completeness
- Data access patterns
- Policy violation counts
- Encryption status
- Backup verification

---

## Implementation Checklist

### Phase 1: Basic Redaction
- [x] Implement PII redaction patterns
- [x] Add middleware for response redaction
- [x] Configure log levels per environment
- [ ] Add redaction tests

### Phase 2: Alerting Infrastructure
- [ ] Set up alerting rules
- [ ] Configure notification channels
- [ ] Implement alert escalation
- [ ] Create monitoring dashboards

### Phase 3: Advanced Monitoring
- [ ] Implement anomaly detection
- [ ] Add behavioral analysis
- [ ] Create incident response automation
- [ ] Set up compliance reporting

---

*Last Updated: 2026-07-15*
*Review Frequency: Monthly*
