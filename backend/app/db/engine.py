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
    future = True,
    connect_args={"ssl": ssl_context},
    pool_pre_ping=True,          # ✅ VERY IMPORTANT
    pool_recycle=300,  
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session

