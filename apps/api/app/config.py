from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_BASE_DIR / ".env", ".env", _BASE_DIR.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    API_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DATABASE_URL: str = "sqlite:///./leadpilot.db"  # Defaults to SQLite for seamless instant zero-config startup, supports postgresql://
    REDIS_URL: str = "redis://localhost:6379/0"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GEMINI_API_KEY: str = ""
    APOLLO_API_KEY: str = ""
    HUNTER_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    EMAIL_SENDING_ENABLED: bool = False
    DEFAULT_WORKSPACE_ID: str = "ws_default_01"
    SENDER_NAME: str = "Ronak Talaviya"
    SENDER_EMAIL: str = "founder@ornitech.in"
    SENDER_COMPANY: str = "Founder, Ornitech Solutions"
    SENDER_WEBSITE: str = "https://ornitech.in"
    ALLOWED_OAUTH_DOMAIN: str = "ornitech.in"
    ADMIN_WHITELIST_EMAILS: str = "ronaktalaviya51@gmail.com"
    JWT_SECRET: str = "ornitech-lead-agent-secret-key-change-in-prod"
    ADMIN_NOTIFICATION_EMAIL: str = "founder@ornitech.in"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    IMAP_SERVER: str = "imap.gmail.com"
    IMAP_USER: str = ""
    IMAP_PASS: str = ""
    AUTOPILOT_AUTO_RUN: bool = True
    AUTOPILOT_INTERVAL_MINUTES: int = 15


settings = Settings()
