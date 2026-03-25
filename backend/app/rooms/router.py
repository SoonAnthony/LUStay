from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.rooms.service import RoomService
from app.rooms.schema import (
    RoomCreate, RoomUpdate,
    RoomPublicRead, RoomAdminRead,
    RoomImageCreate, RoomImageRead
)
from app.rooms.models import Room, RoomStatus, RoomImage
from app.user.models import User, UserRole
from app.user.dependencies import get_current_active_user, get_current_admin

# -------------------------------------------------
# Dependencies
# -------------------------------------------------
async def get_room_service(session: AsyncSession = Depends(get_session)) -> RoomService:
    return RoomService(session)

# -------------------------------------------------
# Routers
# -------------------------------------------------
room_router = APIRouter(prefix="/rooms", tags=["Rooms"])
admin_room_router = APIRouter(prefix="/admin/rooms", tags=["Admin Rooms"])

# ---------------------------
# Helper: compute room status
# ---------------------------
def compute_status(room: Room) -> RoomStatus:
    if getattr(room, "is_under_maintenance", False):
        return RoomStatus.MAINTENANCE
    if getattr(room, "current_occupancy", 0) == 0:
        return RoomStatus.AVAILABLE
    if room.current_occupancy < room.capacity:
        return RoomStatus.PARTIALLY_OCCUPIED
    return RoomStatus.FULLY_OCCUPIED

def map_room_to_public(room: Room) -> RoomPublicRead:
    return RoomPublicRead(
        id=room.id,
        room_number=room.room_number,
        capacity=room.capacity,
        price_single=room.price_single,
        price_double=room.price_double,
        status=compute_status(room),
        images=[RoomImageRead(id=img.id, image_url=img.image_url, image_type=img.image_type) for img in room.images],
    )

def map_room_to_admin(room: Room) -> RoomAdminRead:
    return RoomAdminRead(
        id=room.id,
        room_number=room.room_number,
        capacity=room.capacity,
        price_single=room.price_single,
        price_double=room.price_double,
        status=compute_status(room),
        images=[RoomImageRead(id=img.id, image_url=img.image_url, image_type=img.image_type) for img in room.images],
        bookings=[],  # populate if needed
        created_at=room.created_at,
        updated_at=room.updated_at,
        hostel_id=room.hostel_id
    )

# ============================================================
# PUBLIC ROUTES
# ============================================================
@room_router.get("/", response_model=List[RoomPublicRead])
async def list_available_rooms(
    capacity: Optional[int] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    room_service: RoomService = Depends(get_room_service)
):
    rooms = await room_service.get_rooms(capacity=capacity, min_price=min_price, max_price=max_price)
    available_rooms = [room for room in rooms if compute_status(room) == RoomStatus.AVAILABLE]
    return [map_room_to_public(room) for room in available_rooms]

@room_router.get("/{room_id}", response_model=RoomPublicRead)
async def get_room_details(
    room_id: UUID,
    room_service: RoomService = Depends(get_room_service)
):
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return map_room_to_public(room)

# ============================================================
# LANDLORD + ADMIN ROUTES
# ============================================================
@admin_room_router.post("/", response_model=RoomAdminRead, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.LANDLORD, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only landlords or admins can create rooms")
    try:
        room = await room_service.create_room(hostel_id=current_user.hostel_id, data=payload)
        await room_service.session.commit()
        await room_service.session.refresh(room)
    except ValueError as e:
        await room_service.session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        await room_service.session.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return map_room_to_admin(room)

@admin_room_router.patch("/{room_id}", response_model=RoomAdminRead)
async def update_room(
    room_id: UUID,
    payload: RoomUpdate = Body(...),
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    updates = payload.model_dump(exclude_unset=True)
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if current_user.role != UserRole.ADMIN and room.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this room")
    if current_user.role != UserRole.ADMIN and "status" in updates:
        updates.pop("status")
    updated_room = await room_service.update_room(room_id, RoomUpdate(**updates))
    await room_service.session.commit()
    await room_service.session.refresh(updated_room)
    return map_room_to_admin(updated_room)

@admin_room_router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: UUID,
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if current_user.role != UserRole.ADMIN and room.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this room")
    await room_service.delete_room(room_id)
    await room_service.session.commit()
    return None

# ============================================================
# ADMIN-ONLY ROUTES (example: full list of rooms, override access)
# ============================================================
@admin_room_router.get("/all", response_model=List[RoomAdminRead])
async def list_all_rooms(
    room_service: RoomService = Depends(get_room_service),
    _: User = Depends(get_current_admin)
):
    rooms = await room_service.get_rooms()
    return [map_room_to_admin(room) for room in rooms]

# ============================================================
# ROOM IMAGE ROUTES
# ============================================================
@admin_room_router.post("/{room_id}/images", response_model=List[RoomImageRead])
async def add_room_images(
    room_id: UUID,
    images: List[RoomImageCreate],
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    created_images = await room_service.add_room_images(room_id, images)
    await room_service.session.commit()
    return [RoomImageRead(id=i.id, image_url=i.image_url, image_type=i.image_type) for i in created_images]

@admin_room_router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_image(
    image_id: UUID,
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    await room_service.delete_room_image(image_id)
    await room_service.session.commit()
    return None