from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    APP_TITLE: str = "Auto Buyer Demo - Scoring Stub"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    DATABASE_URL: str = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")         # Vercel Neon integration
        or os.getenv("NEON_DATABASE_URL")    # sometimes used
        or ""
    )

    # JWT settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-this-in-prod")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRES_MINUTES: int = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

