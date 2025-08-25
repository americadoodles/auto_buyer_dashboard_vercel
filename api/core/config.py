from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_TITLE: str = "Auto Buyer Demo – Scoring Stub"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/auto_buyer"   # postgresql://user:pass@host:5432/db

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
