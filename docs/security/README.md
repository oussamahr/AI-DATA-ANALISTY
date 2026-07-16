# Security Documentation

This directory contains the security documentation for the AI Data Analytics Platform.

## Documents

| Document | Description | Audience |
|----------|-------------|----------|
| `threat-model.md` | STRIDE-based threat model covering all data flows | Engineering, Security Review |
| `data-classification.md` | Data classification policy (Public/Internal/Confidential/Restricted) | Engineering, Compliance |
| `security-policies.md` | Security policies, incident response, vulnerability management | Operations, Security |

## Phase 0 Deliverables

These documents are Phase 0 (Foundation) deliverables created before any feature code is written. They serve as the security requirements baseline that all later phases must comply with.

### Review Process

1. **Team Review**: Walk through threat model in sprint planning
2. **Security Review**: For any flow rated Critical or High
3. **Updates**: Threat model must be updated when:
   - New data flow is added
   - New external integration is added
   - Authentication model changes
   - Tenant isolation model changes

### Quick Reference

- FastAPI enforces bearer auth by default, with an optional OIDC/session bridge for cookie-based deployments.
- All protected routes must declare an explicit authorization dependency.
- All datasets are tenant-scoped.
- PII redaction is required before sending to LLM providers.
- Audit logs are immutable and append-only.
- Admin access requires MFA at the identity provider.
