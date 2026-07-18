from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    PROJECT_NAME: str = "AI Data Analytics API"
    PROJECT_DESCRIPTION: str = "Multi-tenant AI-powered data analytics platform"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AUTH_MODE: str = "local"

    OIDC_ISSUER_URL: str = ""
    OIDC_AUDIENCE: str = ""
    OIDC_JWKS_URL: str = ""
    OIDC_SUBJECT_CLAIM: str = "sub"
    OIDC_EMAIL_CLAIM: str = "email"
    OIDC_EMAIL_VERIFIED_CLAIM: str = "email_verified"
    OIDC_AUTO_PROVISION_USERS: bool = False
    OIDC_CLIENT_ID: str = ""
    OIDC_CLIENT_SECRET: str = ""
    OIDC_SCOPES: str = "openid profile email"
    OIDC_ROLES_CLAIM: str = ""
    OIDC_DEFAULT_ROLE: str = "viewer"
    OIDC_ROLE_MAPPING: dict[str, str] = {}

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_data"

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    RATE_LIMIT_AUTH_BURST: str = "5/minute"
    RATE_LIMIT_AUTH_SUSTAINED: str = "20/hour"
    RATE_LIMIT_USER: str = "100/hour"
    RATE_LIMIT_TENANT: str = "1000/hour"

    # AI Provider Configuration
    AI_PROVIDER: str = "gemini"
    AI_PROVIDER_PRIORITY: str = "gemini,groq,openrouter,openai,anthropic,deepseek"
    AI_AUTO_FALLBACK: bool = True
    AI_AUTO_SELECT: bool = True
    AI_MEMORY_ENABLED: bool = True
    AI_STREAMING: bool = True
    AI_MAX_RETRIES: int = 2
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.3
    AI_TIMEOUT: int = 60

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-70b-versatile"

    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Embeddings
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_MODEL: str = "text-embedding-004"

    # AI Logging
    AI_LOG_REQUESTS: bool = True
    AI_LOG_RESPONSES: bool = False
    AI_LOG_ERRORS: bool = True

    # AI Cache
    AI_CACHE_ENABLED: bool = True
    AI_CACHE_TTL: int = 3600

    # Legacy LLM settings (deprecated, kept for backward compatibility)
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = ""
    LLM_MODEL: str = "gpt-4o"
    LLM_MAX_TOKENS: int = 4096
    LLM_TEMPERATURE: float = 0.7

    REDIS_URL: str = "redis://localhost:6379/0"
    SESSION_COOKIE_ENABLED: bool = False
    SESSION_COOKIE_NAME: str = "ai_data_session"
    CSRF_COOKIE_NAME: str = "ai_data_csrf"
    ACCESS_TOKEN_COOKIE_NAME: str = "access_token"
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"
    SESSION_IDLE_TIMEOUT_MINUTES: int = 30
    SESSION_ABSOLUTE_TIMEOUT_HOURS: int = 8

    STORAGE_BACKEND: str = "local"
    STORAGE_PATH: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 100
    ALLOWED_EXTENSIONS: list[str] = [
        ".csv",
        ".tsv",
        ".xlsx",
        ".xls",
        ".json",
        ".parquet",
        ".feather",
    ]

    SENTRY_DSN: str = ""

    LOG_LEVEL: str = "INFO"

    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPER: bool = True
    PASSWORD_REQUIRE_LOWER: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True

    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 48
    RESET_TOKEN_EXPIRE_HOURS: int = 24
    INVITATION_TOKEN_EXPIRE_DAYS: int = 7

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@example.com"
    SMTP_FROM_NAME: str = "AI Data Analytics"
    SMTP_USE_TLS: bool = True

    CLAMAV_HOST: str = "localhost"
    CLAMAV_PORT: int = 3310
    CLAMAV_ENABLED: bool = False

    S3_ENDPOINT: str = "localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_PREFIX: str = "ai-data-analyst"
    S3_USE_SSL: bool = False

    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"


settings = Settings()
