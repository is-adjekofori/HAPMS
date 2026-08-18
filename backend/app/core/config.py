from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "HAPMS API"
    environment: str = "development"

    # Wired up in T0.3 (database) and T2.1 (auth); declared now so .env stays stable
    # as later phases add functionality without reshuffling config.
    database_url: str = ""
    jwt_secret_key: str = ""
    jwt_expiry_minutes: int = 480

    cors_origins: list[str]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    print(settings.cors_origins)
    return settings
