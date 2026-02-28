from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from sqlmodel import SQLModel
from .db.engine import engine
from sqlalchemy import text
from app.user.router import user_router

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


# ✅ Create API v1 router
api_v1_router = APIRouter(prefix="/api/v1")

# ✅ Register domain routers under v1
api_v1_router.include_router(
    user_router,
    prefix="/users",
    tags=["Users"]
)

# ✅ Register version router in app
app.include_router(api_v1_router)


