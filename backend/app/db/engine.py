from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from db.engine import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future = True
)