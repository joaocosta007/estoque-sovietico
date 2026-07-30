from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Estoque Soviético API"
    database_url: str = "sqlite:///./estoque.db"
    api_prefix: str = "/api/v1"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="ESTOQUE_", extra="ignore")


settings = Settings()
