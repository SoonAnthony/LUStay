from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from app.core.config import settings
from typing import AsyncGenerator
import ssl

ssl_context = ssl.create_default_context()

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True,
    connect_args={"ssl": ssl_context},
    pool_pre_ping=True,
    pool_recycle=300,
    query_cache_size=0,
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    # ✅ expire_on_commit=False is CRITICAL for async SQLAlchemy.
    # Without it, every attribute (including relationships like .blocks)
    # expires after commit() and triggers a lazy load — which crashes
    # in async context and silently returns [] for collections.
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session