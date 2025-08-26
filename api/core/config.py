from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    APP_TITLE: str = "Auto Buyer Demo – Scoring Stub"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    DATABASE_URL: str = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")         # Vercel Neon integration
        or os.getenv("NEON_DATABASE_URL")    # sometimes used
        or ""
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
