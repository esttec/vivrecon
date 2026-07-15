"""Konfiguratsioon — loeb .env failist."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:posterkassa@localhost:5432/posterkassa"
    JWT_SECRET_KEY: str = "vahetada-tootmises"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    TZ: str = "Europe/Tallinn"

    # CoffeeIN loyalty webhook
    # Set in .env — leave empty to disable
    COFFEEIN_WEBHOOK_URL: str = ""
    COFFEEIN_WEBHOOK_SECRET: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
