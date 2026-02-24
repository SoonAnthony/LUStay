from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel
from .db.engine import engine
from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup logic
    print("Connecting to the database...")
    async with engine.begin() as conn:
         await conn.execute(text("SELECT 1"))
    print("Connected to the database.")
    yield
    # shutdown logic
    print("Disconnecting from the database...")
    await engine.dispose()
    print("Disconnected from the database.")

app = FastAPI(lifespan=lifespan)


