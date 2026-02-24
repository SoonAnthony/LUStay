from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel
from .db.engine import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup logic
    print("Connecting to the database...")
    async with engine.begin() as conn:
        await conn.run_sync(lambda _: None)
    print("Connecting to the database.")
    yield
    # shutdown logic
    print("Disconnecting from the database...")
    await engine.dispose()
    print("Disconnected from the database.")

app = FastAPI(lifespan=lifespan)


