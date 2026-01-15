from typing import List, Union
from pydantic import AnyHttpUrl, PostgresDsn, validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nexus AI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_KEY_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 60 * 24 * 8 = 8 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "nexus_admin"
    POSTGRES_PASSWORD: str = "secure_password_change_me"
    POSTGRES_DB: str = "nexus_db"
    POSTGRES_PORT: int = 5432
    
    # External API Keys (Optional)
    DEEPGRAM_API_KEY: Union[str, None] = None
    DEEPL_API_KEY: Union[str, None] = None
    OPENROUTER_API_KEY: Union[str, None] = None
    ELEVENLABS_API_KEY: Union[str, None] = None
    
    # System
    SSL_CERT_FILE: Union[str, None] = None
    
    SQLALCHEMY_DATABASE_URI: Union[str, None] = None

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Union[str, None], values: dict[str, any]) -> any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            port=int(values.get("POSTGRES_PORT") or 5432),
            path=f"{values.get('POSTGRES_DB') or ''}",
        ).unicode_string()

    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_file_encoding="utf-8"
    )

settings = Settings()
