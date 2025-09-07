from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./nocturne.db"

    # API
    API_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Nocturne"
    VERSION: str = "1.0.0"

    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins(self) -> List[str]:
        """CORS設定をリストとして取得"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # Environment
    ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Optional services
    OPENAI_API_KEY: str | None = None
    REDIS_URL: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True
    )


@lru_cache()
def get_settings() -> Settings:
    """シングルトンパターンで設定を取得"""
    return Settings()


settings = get_settings()
