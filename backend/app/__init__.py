from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from .db.engine import engine
from sqlalchemy import text
from app.user.router import user_router, admin_router, landlord_router, admin_landlord_router
from app.hostels.router import hostel_router, admin_hostel_router, amenity_router
from app.hostels.image_router import image_router
from app.core.cloudinary import cloudinary
from app.rooms.router import room_landlord_router, room_admin_router, room_public_router
from app.bookings.router import bookings_router
from app.payments.router import payments_router
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Create API v1 router
api_v1_router = APIRouter(prefix="/api/v1")

# ✅ Register domain routers under v1
# Users
api_v1_router.include_router(user_router, prefix="/users", tags=["Users"])
api_v1_router.include_router(admin_router)  # internal prefix /admin
api_v1_router.include_router(landlord_router, tags=["Landlord Requests"])  # remove /users prefix
api_v1_router.include_router(admin_landlord_router)  # internal prefix /admin/landlord-requests

# Hostels
api_v1_router.include_router(hostel_router)
api_v1_router.include_router(admin_hostel_router)
api_v1_router.include_router(image_router)
api_v1_router.include_router(amenity_router)

#Rooms
api_v1_router.include_router(room_landlord_router)
api_v1_router.include_router(room_admin_router) 
api_v1_router.include_router(room_public_router)

#Bookings
api_v1_router.include_router(bookings_router)
#Payments
api_v1_router.include_router(payments_router)
# ✅ Register version router in app
app.include_router(api_v1_router)
