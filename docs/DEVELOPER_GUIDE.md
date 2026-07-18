# AI Data Analyst - Developer Guide

## Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Local Development

```bash
# Clone repository
git clone <repository>
cd AI-DATA-ANALISTY

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with local settings

# Start services (Docker Compose)
docker-compose up -d postgres redis minio

# Run migrations
cd backend
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker (separate terminal)
celery -A app.core.celery_app worker --loglevel=info

# Start Celery beat (separate terminal)
celery -A app.core.celery_app beat --loglevel=info
```

### IDE Configuration

#### VS Code (`.vscode/settings.json`)
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.ruffEnabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit"
  },
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["backend/tests"]
}
```

## Project Structure

```
backend/
├── app/
│   ├── api/v1/              # API routes
│   │   ├── ai_analytics.py  # NEW: AI Analytics endpoints
│   │   ├── analytics.py     # Traditional analytics
│   │   ├── auth.py          # Authentication
│   │   ├── datasets.py      # Dataset management
│   │   ├── exports.py       # Export endpoints
│   │   ├── llm.py           # Legacy LLM endpoints
│   │   ├── visualizations.py # Chart generation
│   │   └── router.py        # Route registration
│   ├── core/
│   │   ├── config.py        # Settings (NEW: AI provider config)
│   │   ├── database.py      # DB connection
│   │   ├── dependencies.py  # FastAPI dependencies
│   │   └── security/        # Auth, rate limiting, audit
│   ├── models/              # SQLAlchemy models
│   │   ├── conversation.py  # NEW: Conversation memory models
│   │   └── ...
│   ├── schemas/             # Pydantic schemas
│   ├── services/
│   │   ├── ai_gateway/      # NEW: AI Gateway architecture
│   │   │   ├── providers/   # Provider implementations
│   │   │   ├── memory/      # Conversation memory
│   │   │   ├── prompts/     # Prompt library
│   │   │   ├── analytics/   # AI Analytics Engine
│   │   │   └── gateway.py   # Main gateway
│   │   ├── llm_service.py   # UPDATED: Uses AI Gateway
│   │   ├── analytics_service.py
│   │   └── ...
│   └── tasks/               # Celery tasks
└── tests/
    └── ai_gateway/          # NEW: AI Gateway tests
```

## AI Gateway Architecture

### Core Principle
**Business services NEVER directly use AI providers.** They only communicate with the AI Gateway.

```
Business Service → AIGateway → ProviderManager → Provider Adapter → AI API
```

### Adding a New Provider

1. **Create provider class** in `app/services/ai_gateway/providers/`:

```python
# my_provider.py
from app.services.ai_gateway.providers.base import (
    AIProvider, AIProviderConfig, ChatMessage, ChatResponse,
    GenerationConfig, MessageRole, ProviderType, StreamChunk
)

class MyProvider(AIProvider):
    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.MY_PROVIDER  # Add to enum

    @property
    def default_model(self) -> str:
        return self.config.default_model or "my-model"

    async def initialize(self):
        # Setup client
        pass

    async def close(self):
        # Cleanup
        pass

    async def chat(self, messages, config=None, tools=None) -> ChatResponse:
        # Implementation
        pass

    async def stream_chat(self, messages, config=None, tools=None):
        # Implementation
        pass

    async def generate(self, prompt, config=None) -> ChatResponse:
        # Implementation
        pass
```

2. **Register in `__init__.py`**:
```python
from .my_provider import MyProvider
PROVIDER_CLASSES[ProviderType.MY_PROVIDER] = MyProvider
```

3. **Add to ProviderManager** config:
```python
# In manager.py _build_provider_config()
ProviderType.MY_PROVIDER: AIProviderConfig(...)
```

4. **Add environment variable** in `config.py`:
```python
MY_PROVIDER_API_KEY: str = ""
MY_PROVIDER_MODEL: str = "my-model"
```

5. **Add to priority list** (optional):
```python
DEFAULT_PROVIDER_PRIORITY = [
    ProviderType.GEMINI,
    ProviderType.MY_PROVIDER,  # Add here
    ...
]
```

### Using AI Gateway in Services

```python
from app.services.ai_gateway import get_ai_gateway, ChatMessage, GenerationConfig, MessageRole

class MyService:
    def __init__(self, gateway: AIGateway = Depends(get_ai_gateway)):
        self.gateway = gateway

    async def analyze(self, data: str) -> str:
        messages = [
            ChatMessage(role=MessageRole.SYSTEM, content="You are an analyst"),
            ChatMessage(role=MessageRole.USER, content=data),
        ]
        response = await self.gateway.chat(messages)
        return response.content

    async def structured_analysis(self, data: str, model: type[BaseModel]) -> BaseModel:
        parsed, _ = await self.gateway.structured_generate(
            prompt=data,
            response_model=model,
        )
        return parsed
```

## AI Analytics Engine

### Adding New Analytics Features

1. **Add method to `AIAnalyticsEngine`** in `app/services/ai_gateway/analytics/engine.py`

2. **Create prompt template** in `PromptLibrary._initialize_prompts()`:

```python
self._add_prompt(PromptTemplate(
    id="my_analysis",
    name="My Analysis",
    description="Description",
    category=PromptCategory.DATA_EXPLORATION,
    variables=["dataset_profile", "question"],
    output_format=OutputFormat.JSON,
    template="Analyze: {dataset_profile}\nQuestion: {question}",
))
```

3. **Add API endpoint** in `app/api/v1/ai_analytics.py`:

```python
@router.post("/my-analysis/{dataset_id}")
async def my_analysis(
    dataset_id: UUID,
    request: MyAnalysisRequest,
    current_user: User = Depends(require_verified),
    engine: AIAnalyticsEngine = Depends(get_ai_analytics_engine),
):
    result = await engine.my_analysis(dataset_id, current_user, request.question)
    return result
```

4. **Register in audit logger**:
```python
await audit_logger.log(
    "MY_ANALYSIS",
    "dataset",
    str(dataset_id),
    str(current_user.id),
    str(current_user.tenant_id) if current_user.tenant_id else None,
)
```

## Database Models

### Adding New Models

1. **Create model** in `app/models/`:
```python
# my_model.py
from sqlalchemy import Column, String, Uuid
from app.core.database import Base
import uuid

class MyModel(Base):
    __tablename__ = "my_models"
    id = Column(Uuid(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255))
```

2. **Register in `app/models/__init__.py`**:
```python
from app.models.my_model import MyModel
__all__ = [..., "MyModel"]
```

3. **Create migration**:
```bash
alembic revision --autogenerate -m "Add MyModel"
alembic upgrade head
```

## Testing

### Running Tests
```bash
# All tests
pytest backend/tests -v

# Specific module
pytest backend/tests/ai_gateway/test_providers.py -v

# With coverage
pytest backend/tests --cov=app --cov-report=html
```

### Writing Tests

```python
# test_my_feature.py
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_my_feature():
    # Setup
    mock_gateway = AsyncMock()
    mock_gateway.chat.return_value = ChatResponse(
        content="Test response",
        model="test-model",
        provider=ProviderType.OPENAI,
    )

    # Test
    service = MyService(gateway=mock_gateway)
    result = await service.analyze("test data")

    # Assert
    assert result == "Test response"
    mock_gateway.chat.assert_called_once()
```

## Code Quality

### Linting & Formatting
```bash
# Format
black backend/

# Lint
ruff check backend/

# Type check
pyright backend/
```

### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
```

## Contributing

### Branch Strategy
- `main` - Production ready
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Run linting, type checking, tests
4. Update documentation
5. Submit PR to `develop`
6. Code review
7. Merge to `develop`
8. Release to `main` via release branch

### Commit Messages
```
feat: Add new AI provider for Cohere
fix: Handle streaming timeout in Groq provider
docs: Update API documentation for forecasting
test: Add tests for anomaly detection
refactor: Simplify provider manager fallback logic
```

## Debugging

### Debug AI Gateway
```python
# Enable debug logging
import logging
logging.getLogger("ai_gateway").setLevel(logging.DEBUG)

# Check provider health
gateway = get_ai_gateway()
health = await gateway.health_check()
print(health)

# Test specific provider
from app.services.ai_gateway.providers import ProviderType
response = await gateway.chat(
    messages=[ChatMessage(role=MessageRole.USER, content="test")],
    provider_type=ProviderType.GEMINI,
)
```

### Debug Conversation Memory
```python
memory = get_conversation_memory()
conversations = await memory.list_conversations(dataset_id, user)
for conv in conversations:
    messages = await memory.get_messages(conv.id, user)
    print(f"Conversation: {conv.title}, Messages: {len(messages)}")
```

### Debug Analytics Engine
```python
engine = get_ai_analytics_engine()
profile = await engine.profile_dataset_on_upload(dataset_id, user)
print(f"Quality Score: {profile.quality_score}")
print(f"Suggested Charts: {len(profile.suggested_charts)}")
```

## Performance Optimization

### Caching
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_dataset_context(dataset_id: str) -> dict:
    # Expensive computation cached
    pass
```

### Async Best Practices
```python
# Good: Concurrent operations
results = await asyncio.gather(
    engine.generate_insights(dataset_id, user),
    engine.recommend_charts(dataset_id, user),
    engine.assess_data_quality(dataset_id, user),
)

# Bad: Sequential
insights = await engine.generate_insights(dataset_id, user)
charts = await engine.recommend_charts(dataset_id, user)
```

### Database Queries
```python
# Good: Select only needed columns
result = await db.execute(
    select(Dataset.id, Dataset.name).where(Dataset.tenant_id == tenant_id)
)

# Good: Use selectinload for relationships
result = await db.execute(
    select(Dataset).options(selectinload(Dataset.owner)).where(...)
)
```

## Extending the Platform

### Custom Prompt Templates
Users can add custom prompts via API (future) or directly in code:

```python
prompts = get_prompt_library()
prompts.register_prompt_template(
    "my_custom_analysis",
    "Analyze {dataset_name} for {metric}: {question}"
)
```

### Custom Chart Types
Add to `VisualizationService` and register in chart recommendation prompt.

### Custom Report Formats
Extend `ExportService` with new format handlers (PDF, Word, HTML).

### Webhooks for Async Operations
```python
# In task completion
await notify_webhook(task_id, result, webhook_url)
```

---

*Last Updated: 2026-07-18*
*Version: 2.0.0*