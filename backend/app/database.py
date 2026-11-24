"""
database.py — Async SQLAlchemy engine + session factory.
Supports both PostgreSQL (async via asyncpg) and SQLite (via aiosqlite).
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

_url = (settings.DATABASE_URL or "").strip()
if not _url:
    _url = "sqlite+aiosqlite:///./campus_feedback.db"
elif _url.startswith("postgresql://"):
    _url = _url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql+asyncpg://", 1)

# SQLite needs check_same_thread=False equivalent; asyncpg needs pool settings
_engine_kwargs: dict = {}
if "sqlite" in _url:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(
    _url,
    echo=False,
    **_engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        yield session
