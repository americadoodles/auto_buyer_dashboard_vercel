from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    APP_TITLE: str = "Auto Buyer Demo - Scoring Stub"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    DATABASE_URL: str = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")         # Vercel Neon integration
        or os.getenv("NEON_DATABASE_URL")    # sometimes used
        or os.getenv("STAGING_DATABASE_URL")
        or os.getenv("STAGING_POSTGRES_URL")         
        or os.getenv("STAGING_NEON_DATABASE_URL")
        or ""
    )
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "local")

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

    # Vercel Blob storage settings
    BLOB_READ_WRITE_TOKEN: str = os.getenv("BLOB_READ_WRITE_TOKEN", "")
    BLOB_STORE_URL: str = os.getenv("BLOB_STORE_URL", "")  

    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    # Hard switch to bypass the AI service regardless of key presence.
    # Set AI_ENABLED=false in .env to fall back to rule-based scoring everywhere.
    AI_ENABLED: bool = os.getenv("AI_ENABLED", "true").strip().lower() not in ("0", "false", "no", "off", "")

    # Vision model for the damage-detection agent. gpt-4o is markedly better at
    # spotting/localizing damage than gpt-4o-mini, and image tokens cost about
    # the same on both (mini inflates image token counts) — only the text
    # portion is pricier. Override per environment if needed.
    DAMAGE_VISION_MODEL: str = os.getenv("DAMAGE_VISION_MODEL", "gpt-4o")
    # "high" sends full-resolution image tiles — small dents/scratches are
    # often invisible at "auto"/"low". Set to "auto" to cut image token cost.
    DAMAGE_VISION_DETAIL: str = os.getenv("DAMAGE_VISION_DETAIL", "high")
    # Max photos analyzed per listing. Too low silently drops exterior shots
    # on image-heavy listings (FB listings often lead with interior photos).
    DAMAGE_MAX_IMAGES: int = int(os.getenv("DAMAGE_MAX_IMAGES", "12"))

    # Google Cloud Storage settings
    GCP_BUCKET_NAME: str = os.getenv("GCP_BUCKET_NAME", "")
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "")
    GCP_CREDENTIALS_JSON: str = os.getenv("GCP_CREDENTIALS_JSON", "")  # JSON string or path to JSON file
    GCP_STORAGE_ENABLED: bool = bool(os.getenv("GCP_STORAGE_ENABLED", "false").lower() == "true")

    # Twilio settings for calls and SMS
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    TWILIO_ENABLED: bool = bool(os.getenv("TWILIO_ENABLED", "false").lower() == "true")
    # Twilio Messaging Service SID for A2P 10DLC compliance (recommended for SMS)
    # Create a Messaging Service in Twilio Console and register your 10DLC campaign
    TWILIO_MESSAGING_SERVICE_SID: str = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")
    # Twilio API Key for browser-based voice (Access Tokens)
    TWILIO_API_KEY: str = os.getenv("TWILIO_API_KEY", "")
    TWILIO_API_SECRET: str = os.getenv("TWILIO_API_SECRET", "")
    TWILIO_TWIML_APP_SID: str = os.getenv("TWILIO_TWIML_APP_SID", "")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

