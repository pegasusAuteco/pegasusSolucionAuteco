from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://motorconnect:localdev123@db:5432/motorconnect_db"
    JWT_SECRET: str = "your-super-secret-key-change-in-production-123456789"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
