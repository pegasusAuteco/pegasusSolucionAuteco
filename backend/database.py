"""
Async database configuration using SQLAlchemy with PostgreSQL.

Provides the async engine, session factory, declarative base class,
and a dependency-injection generator for FastAPI endpoints.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

# Async engine connected to PostgreSQL via the DATABASE_URL setting
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Session factory that creates async sessions with auto-expire disabled
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base class for all SQLAlchemy ORM models."""
    pass


async def get_session() -> AsyncSession:
    """
    FastAPI dependency that yields an async database session.

    Used with Depends() in route handlers to get a session per request.
    The session is automatically closed after the request completes.
    """
    async with async_session_factory() as session:
        yield session
