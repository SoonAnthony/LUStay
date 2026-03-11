from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from .db.engine import engine
from sqlalchemy import text
from app.user.router import user_router, admin_router, landlord_router, admin_landlord_router
from app.hostels.router import hostel_router, admin_hostel_router
from app.hostels.image_router import image_router

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

api_v1_router.include_router(
    admin_router
)
api_v1_router.include_router(
    landlord_router,
    prefix="/users",
)
api_v1_router.include_router(
    admin_landlord_router
)
api_v1_router.include_router(
    hostel_router
)
api_v1_router.include_router(
    admin_hostel_router
)
api_v1_router.include_router(
     image_router
)

# ✅ Register version router in app
app.include_router(api_v1_router)
