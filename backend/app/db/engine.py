from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from app.core.config import settings
from typing import AsyncGenerator

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future = True
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session

