from unittest import result

from fastapi import APIRouter, Depends, HTTPException, status, Body, File, UploadFile, Form
from typing import List, Optional
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.rooms.service import RoomService
from app.rooms.schema import (
    RoomCreate, RoomUpdate,
    RoomPublicRead, RoomAdminRead, RoomImageRead
)
from app.rooms.models import Room, RoomStatus, RoomImage
from app.user.models import User, UserRole
from app.user.dependencies import get_current_active_user, get_current_admin
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel import select


async def get_room_service(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_active_user)) -> RoomService:
    return RoomService(session, current_user)
    

async def get_admin_room_service(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_admin)) -> RoomService:
    return RoomService(session, current_user)

async def get_public_room_service(session: AsyncSession = Depends(get_session)) -> RoomService:
    return RoomService(session, current_user=None)

room_router = APIRouter(prefix="/rooms", tags=["Public Rooms"])
room_landlord_router = APIRouter(prefix="/landlord/rooms", tags=["Landlord Rooms"])
room_admin_router = APIRouter(prefix="/admin/rooms", tags=["Admin Rooms"])


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


@room_router.get("/", response_model=List[RoomPublicRead])
async def list_available_rooms(
    capacity: Optional[int] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    room_service: RoomService = Depends(get_public_room_service)
):
    rooms = await room_service.get_rooms(capacity=capacity, min_price=min_price, max_price=max_price)
    available_rooms = [room for room in rooms if compute_status(room) == RoomStatus.AVAILABLE]
    return [map_room_to_public(room) for room in available_rooms]

@room_router.get("/{room_id}", response_model=RoomPublicRead)
async def get_room_details(
    room_id: UUID,
    room_service: RoomService = Depends(get_public_room_service)
):
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return map_room_to_public(room)


@room_landlord_router.get("/", response_model=List[RoomAdminRead])
async def list_my_rooms(
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != UserRole.LANDLORD:
        raise HTTPException(status_code=403, detail="Only landlords can access this route")
    rooms = await room_service.get_rooms()
    my_rooms = [room for room in rooms if getattr(room, "owner_id", None) == current_user.id]
    return [map_room_to_admin(room) for room in my_rooms]

@room_landlord_router.post("/", response_model=RoomAdminRead, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != UserRole.LANDLORD:
        raise HTTPException(status_code=403, detail="Only landlords can create rooms")

    try:
        room = await room_service.create_room(hostel_id=payload.hostel_id, data=payload)
        room_service.session.add(room)
        await room_service.session.flush() 

        if payload.images:
            for upload_file in payload.images:
                image_url, public_id = await room_service.upload_image(upload_file)
                image_type = getattr(upload_file, "image_type", None) or "GENERAL"
                await room_service.add_room_image(
                    room_id=room.id,
                    image_url=image_url,
                    image_public_id=public_id,
                    image_type=image_type
                )
        await room_service.session.commit()
        response = map_room_to_admin(room)

    except IntegrityError as e:
        await room_service.session.rollback()
        if 'unique_room_per_hostel' in str(e.orig):
            raise HTTPException(
                status_code=400,
                detail=f"Room number {payload.room_number} already exists in this hostel"
            )
        raise HTTPException(status_code=500, detail="Database error")
    except ValueError as e:
        await room_service.session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await room_service.session.rollback()
        print("CREATE ROOM ERROR:", e)
        raise HTTPException(status_code=500, detail="Database error")

    return response

@room_landlord_router.post("/{room_id}/images", response_model=List[RoomImageRead])
async def add_room_images_landlord(
    room_id: UUID,
    image_type: Optional[str] = Form(None),
    images: List[UploadFile] = File(...),
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot add images to rooms you do not own")
    created_images = await room_service.add_room_images(
        room_id, images, image_type=image_type
    )
    await room_service.session.commit()
    return [RoomImageRead(id=i.id, image_url=i.image_url, image_type=i.image_type) for i in created_images]

@room_landlord_router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_image_landlord(
    image_id: UUID,
    room_service: RoomService = Depends(get_room_service),
    current_user: User = Depends(get_current_active_user)
):
    room_image = await room_service.session.get(RoomImage, image_id)
    if not room_image:
        raise HTTPException(status_code=404, detail="Image not found")

    await room_service.session.refresh(room_image, attribute_names=["room"])

    if room_image.room.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete images from rooms you do not own")

    await room_service.delete_room_image(image_id)
    await room_service.session.commit()
    return None


@room_admin_router.get("/", response_model=List[RoomAdminRead])
async def list_all_rooms_admin(
    room_service: RoomService = Depends(get_admin_room_service)
):
    rooms = await room_service.get_rooms()
    return [map_room_to_admin(room) for room in rooms]

@room_admin_router.post("/", response_model=RoomAdminRead, status_code=status.HTTP_201_CREATED)
async def create_room_admin(
    payload: RoomCreate,
    room_service: RoomService = Depends(get_admin_room_service)
):
    room = await room_service.create_room(hostel_id=payload.hostel_id, data=payload)
    await room_service.session.commit()
    await room_service.session.refresh(room)
    return map_room_to_admin(room)

@room_admin_router.patch("/{room_id}", response_model=RoomAdminRead)
async def update_room_admin(
    room_id: UUID,
    payload: RoomUpdate = Body(...),
    room_service: RoomService = Depends(get_admin_room_service),
):
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    updated_room = await room_service.update_room(room_id, payload)
    await room_service.session.commit()
    await room_service.session.refresh(updated_room)
    return map_room_to_admin(updated_room)

@room_admin_router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_admin(
    room_id: UUID,
    room_service: RoomService = Depends(get_admin_room_service)
):
    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await room_service.delete_room(room_id)
    await room_service.session.commit()
    return None

@room_admin_router.post("/{room_id}/images", response_model=List[RoomImageRead])
async def add_room_images_admin(
    room_id: UUID,
    image_type: Optional[str] = Form(None),
    images: List[UploadFile] = File(...),
   room_service: RoomService = Depends(get_admin_room_service),
):
    created_images = await room_service.add_room_images(
        room_id,
        images=images, 
        image_type=image_type
    )
    await room_service.session.commit()
    return [RoomImageRead(id=i.id, image_url=i.image_url, image_type=i.image_type) for i in created_images]

@room_admin_router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_image_admin(
    image_id: UUID,
    room_service: RoomService = Depends(get_admin_room_service),
):
    room_image = await room_service.session.get(RoomImage, image_id)
    if not room_image:
        raise HTTPException(status_code=404, detail="Image not found")

    await room_service.session.refresh(room_image, attribute_names=["room"])

    await room_service.delete_room_image(image_id)
    await room_service.session.commit()
    return None