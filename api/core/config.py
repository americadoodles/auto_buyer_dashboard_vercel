from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    APP_TITLE: str = "Auto Buyer Demo - Scoring Stub"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    DATABASE_URL: str = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")         # Vercel Neon integration
        or os.getenv("NEON_DATABASE_URL")    # sometimes used
        or os.getenv("STAGING_DATABASE_URL")
        or os.getenv("STAGING_POSTGRES_URL")         
        or os.getenv("STAGING_NEON_DATABASE_URL")
        or ""
    )
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "cloud")

    # JWT settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-this-in-prod")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRES_MINUTES: int = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

    # Slack settings
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
    SLACK_CHANNEL: str = os.getenv("SLACK_CHANNEL", "#leads-inbox")
    SLACK_ENABLED: bool = bool(os.getenv("SLACK_ENABLED", "false").lower() == "true")
    
    # Slack workflow settings
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN", "")
    SLACK_WORKFLOW_WEBHOOK_URL: str = os.getenv("SLACK_WORKFLOW_WEBHOOK_URL", "")
    SLACK_WORKFLOW_STEP_ID: str = os.getenv("SLACK_WORKFLOW_STEP_ID", "")
    SLACK_WORKFLOW_ENABLED: bool = bool(os.getenv("SLACK_WORKFLOW_ENABLED", "false").lower() == "true")

    # Database connection pool settings
    DB_POOL_MIN_SIZE: int = int(os.getenv("DB_POOL_MIN_SIZE", "2"))
    DB_POOL_MAX_SIZE: int = int(os.getenv("DB_POOL_MAX_SIZE", "10"))
    DB_POOL_RECYCLE_SECONDS: int = int(os.getenv("DB_POOL_RECYCLE_SECONDS", "3600"))  # 1 hour
    DB_POOL_TIMEOUT_SECONDS: int = int(os.getenv("DB_POOL_TIMEOUT_SECONDS", "30"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

