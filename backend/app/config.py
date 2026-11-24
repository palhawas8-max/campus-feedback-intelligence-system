"""
config.py — Application settings loaded from environment variables.
Falls back to SQLite when DATABASE_URL is not set (dev/no-Docker mode).
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # --- Database ---
    DATABASE_URL: str = "sqlite+aiosqlite:///./campus_feedback.db"

    # --- MongoDB Atlas ---
    MONGODB_URL: str = "mongodb+srv://palhawas8_db_user:VRZfOjitAr4LhjPz@cluster0.1bx8exf.mongodb.net/?retryWrites=true&w=majority"
    MONGODB_DB_NAME: str = "campus_feedback"

    # --- JWT ---
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # --- App ---
    APP_NAME: str = "Campus Feedback Intelligence System"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
