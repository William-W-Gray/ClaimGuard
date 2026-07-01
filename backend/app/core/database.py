"""Async SQLAlchemy 2.x engine, session factory, and FastAPI dependency."""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# NullPool is used implicitly for SQLite (tests); Postgres uses the configured pool.
_engine_kwargs: dict = {"echo": settings.db_echo, "future": True, "pool_pre_ping": True}
if settings.database_url.startswith("postgresql"):
    _engine_kwargs.update(
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
    )

engine = create_async_engine(settings.database_url, **_engine_kwargs)

SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional session; commit on success, rollback on error."""
    async with SessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def ping_db() -> bool:
    """Lightweight connectivity check for readiness probes."""
    from sqlalchemy import text

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
