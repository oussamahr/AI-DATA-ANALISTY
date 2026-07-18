# AI Data Analyst - Deployment Guide

## Overview

This guide covers deploying the AI Data Analyst backend in production environments.

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 22.04+, RHEL 9+, Amazon Linux 2023)
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB+ recommended
- **Disk**: 50GB+ SSD
- **Docker**: 24.0+ / Docker Compose 2.20+

### External Services
- **PostgreSQL**: 15+ (with pgvector extension for future semantic search)
- **Redis**: 7+ (for caching, Celery broker, rate limiting)
- **S3-compatible Storage**: MinIO, AWS S3, Google Cloud Storage, Azure Blob

### AI Provider API Keys (at least one required)
- Google Gemini API Key
- Groq API Key
- OpenRouter API Key
- OpenAI API Key
- Anthropic API Key
- DeepSeek API Key

## Quick Start (Docker Compose)

### 1. Clone and Configure
```bash
git clone <repository>
cd AI-DATA-ANALISTY
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Verify Deployment
```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/ai/providers/status
```

## Configuration

### Environment Variables

Create `backend/.env`:

```bash
# Application
PROJECT_NAME="AI Data Analytics API"
ENVIRONMENT=production
VERSION=2.0.0
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/ai_data

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ORIGINS=["https://your-frontend.com"]

# AI Providers (at least one required)
AI_PROVIDER=gemini
AI_PROVIDER_PRIORITY=gemini,groq,openrouter,openai,anthropic,deepseek

GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
OPENROUTER_API_KEY=your-openrouter-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
DEEPSEEK_API_KEY=your-deepseek-key

# Storage
STORAGE_BACKEND=s3
S3_ENDPOINT=minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_PREFIX=ai-data-analyst
S3_USE_SSL=false

# File Upload
MAX_UPLOAD_SIZE_MB=100
ALLOWED_EXTENSIONS=[".csv",".tsv",".xlsx",".xls",".json",".parquet",".feather"]

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME="AI Data Analytics"
SMTP_USE_TLS=true

# Security
RATE_LIMIT_AUTH_BURST=5/minute
RATE_LIMIT_AUTH_SUSTAINED=20/hour
RATE_LIMIT_USER=100/hour
RATE_LIMIT_TENANT=1000/hour

# Logging
LOG_LEVEL=INFO
SENTRY_DSN=

# ClamAV (optional virus scanning)
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_ENABLED=false
```

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_data
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/ai_data
      - REDIS_URL=redis://redis:6379/0
      - S3_ENDPOINT=minio:9000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A app.core.celery_app worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/ai_data
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A app.core.celery_app beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/ai_data
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

## Kubernetes Deployment

### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-data-analyst
```

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-data-analyst-config
  namespace: ai-data-analyst
data:
  ENVIRONMENT: "production"
  AI_PROVIDER: "gemini"
  AI_PROVIDER_PRIORITY: "gemini,groq,openrouter,openai,anthropic,deepseek"
  LOG_LEVEL: "INFO"
```

### Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ai-data-analyst-secrets
  namespace: ai-data-analyst
type: Opaque
stringData:
  SECRET_KEY: "your-secret-key"
  DATABASE_URL: "postgresql+asyncpg://user:pass@postgres:5432/ai_data"
  REDIS_URL: "redis://redis:6379/0"
  GEMINI_API_KEY: "your-key"
  GROQ_API_KEY: "your-key"
  OPENROUTER_API_KEY: "your-key"
  OPENAI_API_KEY: "your-key"
  ANTHROPIC_API_KEY: "your-key"
  DEEPSEEK_API_KEY: "your-key"
  S3_ACCESS_KEY: "minioadmin"
  S3_SECRET_KEY: "minioadmin"
  SMTP_PASSWORD: "password"
```

### Deployment (API)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-data-analyst-api
  namespace: ai-data-analyst
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-data-analyst-api
  template:
    metadata:
      labels:
        app: ai-data-analyst-api
    spec:
      containers:
      - name: api
        image: your-registry/ai-data-analyst-api:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: ai-data-analyst-config
        - secretRef:
            name: ai-data-analyst-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-data-analyst-api
  namespace: ai-data-analyst
spec:
  selector:
    app: ai-data-analyst-api
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
```

### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-data-analyst-ingress
  namespace: ai-data-analyst
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: ai-data-analyst-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ai-data-analyst-api
            port:
              number: 80
```

### Celery Worker Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-data-analyst-worker
  namespace: ai-data-analyst
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-data-analyst-worker
  template:
    metadata:
      labels:
        app: ai-data-analyst-worker
    spec:
      containers:
      - name: worker
        image: your-registry/ai-data-analyst-api:latest
        command: ["celery", "-A", "app.core.celery_app", "worker", "--loglevel=info", "--concurrency=4"]
        envFrom:
        - configMapRef:
            name: ai-data-analyst-config
        - secretRef:
            name: ai-data-analyst-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### HPA (Horizontal Pod Autoscaler)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-data-analyst-api-hpa
  namespace: ai-data-analyst
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-data-analyst-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
    scaleUp:
      stabilizationWindowSeconds: 60
```

## Database Migrations

### Run Migrations
```bash
# Using Docker Compose
docker-compose exec api alembic upgrade head

# Using Kubernetes
kubectl exec -n ai-data-analyst deploy/ai-data-analyst-api -- alembic upgrade head
```

### Create Migration
```bash
alembic revision --autogenerate -m "Description of changes"
```

## SSL/TLS Configuration

### Let's Encrypt with cert-manager
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Monitoring

### Prometheus Metrics
Add to FastAPI app:
```python
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

### Key Metrics to Alert On
- `http_requests_total` - Request rate
- `http_request_duration_seconds` - Latency (p95 > 2s)
- `celery_tasks_failed_total` - Task failures
- `ai_provider_health` - Provider availability
- `database_connections_active` - Connection pool usage

### Grafana Dashboards
- API Overview (requests, latency, errors)
- AI Provider Status (health, fallback rate, token usage)
- Business Metrics (datasets, analyses, conversations)
- Infrastructure (CPU, memory, disk, network)

## Logging

### Structured Logging
```python
# Already configured in main.py
LOG_LEVEL=INFO  # or DEBUG for troubleshooting
```

### Log Aggregation (ELK/Loki)
```yaml
# Docker logging driver
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

### Audit Logs
Stored in PostgreSQL `audit_logs` table:
- All AI queries with user/tenant context
- Dataset operations
- Authentication events
- Admin actions

## Backup & Disaster Recovery

### Database Backup
```bash
# Automated daily backup
pg_dump -h postgres -U postgres ai_data | gzip > backup_$(date +%Y%m%d).sql.gz

# Point-in-time recovery (with WAL archiving)
```

### File Storage Backup
```bash
# MinIO/S3 sync
mc mirror minio/ai-data-analyst s3/backup-bucket/ai-data-analyst
```

### Restore Procedure
1. Restore PostgreSQL from backup
2. Restore file storage
3. Run migrations (if schema changed)
4. Verify health checks
5. Update DNS if needed

## Scaling Guidelines

### API Horizontal Scaling
- Start with 3 replicas
- Scale based on CPU > 70% or memory > 80%
- Max 20 replicas (adjust based on DB connections)

### Database Scaling
- **Read Replicas**: Add for read-heavy workloads
- **Connection Pooling**: Use PgBouncer (max 100 connections per API pod)
- **Partitioning**: Consider for large analytics tables

### Redis Scaling
- **Cluster Mode**: For > 10k ops/sec
- **Persistence**: AOF every second
- **Memory**: 2-4GB for caching + Celery

### Celery Workers
- **Concurrency**: 4 per worker (adjust for CPU-bound tasks)
- **Replicas**: 2-4 for HA
- **Queue Priority**: Separate queues for AI vs export tasks

## Security Hardening

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-internal
  namespace: ai-data-analyst
spec:
  podSelector:
    matchLabels:
      app: ai-data-analyst-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### Secrets Management
- Use external secret store (Vault, AWS Secrets Manager, GCP Secret Manager)
- Rotate keys quarterly
- Audit secret access

### Image Security
```dockerfile
# Use distroless or minimal base images
FROM python:3.11-slim AS builder
# ... build steps
FROM gcr.io/distroless/python3-debian11
COPY --from=builder /app /app
USER nonroot:nonroot
```

## Troubleshooting

### Common Issues

#### All AI Providers Unhealthy
```bash
# Check API keys
kubectl exec -n ai-data-analyst deploy/ai-data-analyst-api -- env | grep API_KEY

# Check provider health
curl -H "Authorization: Bearer $TOKEN" https://api.yourdomain.com/api/v1/ai/providers/status

# Check logs
kubectl logs -n ai-data-analyst -l app=ai-data-analyst-api -f
```

#### High Latency
```bash
# Check database connections
kubectl exec -n ai-data-analyst deploy/ai-data-analyst-api -- pgbouncer -R

# Check Redis latency
redis-cli --latency-history -h redis

# Check Celery queue depth
redis-cli LLEN celery
```

#### Out of Memory
```bash
# Check memory limits
kubectl top pods -n ai-data-analyst

# Increase limits or add replicas
# Check for memory leaks in application logs
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
kubectl logs -n ai-data-analyst -l app=postgres

# Check connection pool
SELECT * FROM pg_stat_activity WHERE datname = 'ai_data';
```

### Debug Commands
```bash
# Enter API pod
kubectl exec -it -n ai-data-analyst deploy/ai-data-analyst-api -- bash

# Run Python shell
python -c "from app.services.ai_gateway import get_ai_gateway; import asyncio; g = get_ai_gateway(); print(asyncio.run(g.health_check()))"

# Check Celery tasks
celery -A app.core.celery_app inspect active
celery -A app.core.celery_app inspect stats
```

## Upgrading

### Blue-Green Deployment
1. Deploy new version to green namespace
2. Run smoke tests
3. Switch ingress to green
4. Monitor for 30 minutes
5. Decommission blue

### Rolling Update (Default)
```bash
kubectl set image deployment/ai-data-analyst-api api=your-registry/ai-data-analyst-api:v2.1.0 -n ai-data-analyst
kubectl rollout status deployment/ai-data-analyst-api -n ai-data-analyst
```

### Database Migrations
```bash
# Always run migrations before switching traffic
kubectl exec -n ai-data-analyst deploy/ai-data-analyst-api -- alembic upgrade head
```

## Support

### Health Check Endpoints
- `GET /api/v1/health` - Basic
- `GET /api/v1/ai/providers/status` - AI providers
- `GET /api/v1/ai/providers/health` - Detailed health

### Log Locations
- Application: stdout/stderr (container logs)
- Database: PostgreSQL logs
- Redis: Redis logs
- Celery: Worker logs

### Performance Baselines
- API p95 latency: < 500ms
- AI query p95 latency: < 10s (depends on provider)
- File upload: < 30s for 100MB
- Background task queue: < 100 pending

---

*Last Updated: 2026-07-18*
*Version: 2.0.0*