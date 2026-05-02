from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from starlette.middleware.base import BaseHTTPMiddleware
from .db.engine import engine
from sqlalchemy import text
from app.user.router import user_router, admin_router, landlord_router, admin_landlord_router
from app.user.image_router import profile_image_router
from app.user.document_router import document_router
from app.hostels.router import hostel_router, admin_hostel_router, amenity_router
from app.hostels.image_router import image_router
from app.core.cloudinary import cloudinary
from app.rooms.router import room_landlord_router, room_admin_router, room_public_router
from app.bookings.router import bookings_router
from app.payments.router import payments_router
from fastapi.middleware.cors import CORSMiddleware


# ── SECURITY HEADERS MIDDLEWARE ───────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]         = "DENY"
        response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
            "img-src 'self' data: https://res.cloudinary.com fastapi.tiangolo.com; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://lustay.onrender.com https://lustay.vercel.app"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Connecting to the database...")
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    print("Connected to the database.")
    yield
    print("Disconnecting from the database...")
    print("Disconnected from the database.")


app = FastAPI(lifespan=lifespan)

# ✅ Security headers
app.add_middleware(SecurityHeadersMiddleware)

# ✅ CORS — must allow credentials for cookies to work
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://lustay.vercel.app",],  # ✅ explicit origin, not "*"
    allow_credentials=True,                   # ✅ required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────
api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(user_router, prefix="/users", tags=["Users"])
api_v1_router.include_router(admin_router)
api_v1_router.include_router(landlord_router, prefix="/users", tags=["Landlord Requests"])
api_v1_router.include_router(admin_landlord_router)
api_v1_router.include_router(profile_image_router)
api_v1_router.include_router(document_router)

api_v1_router.include_router(hostel_router)
api_v1_router.include_router(admin_hostel_router)
api_v1_router.include_router(image_router)
api_v1_router.include_router(amenity_router)

api_v1_router.include_router(room_landlord_router)
api_v1_router.include_router(room_admin_router)
api_v1_router.include_router(room_public_router)

api_v1_router.include_router(bookings_router)
api_v1_router.include_router(payments_router)

app.include_router(api_v1_router)