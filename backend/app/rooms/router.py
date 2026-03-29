# backend/app/rooms/router.py
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.rooms.schema import (
    RoomTypeCreate, RoomTypeRead,  RoomTypeImageRead,
    RoomCreate, RoomRead, RoomUpdate
)
from app.rooms.service import RoomService
from app.user.dependencies import (
    get_current_user,
    get_current_admin,
    get_current_landlord_or_admin
)
from app.db.engine import get_session
from app.user.models import User

# Routers
room_landlord_router = APIRouter(prefix="/landlord/rooms", tags=["Rooms Landlord"])
room_admin_router = APIRouter(prefix="/admin/rooms", tags=["Rooms Admin"])
room_public_router = APIRouter(prefix="/rooms", tags=["Rooms Public"])


# LANDLORD ROUTES
@room_landlord_router.post("/room-types/", response_model=RoomTypeRead)
async def create_room_type_landlord(
    data: RoomTypeCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Landlord can create RoomTypes for their own hostels.
    """
    service = RoomService(session)
    return await service.create_room_type(data, current_user)


@room_landlord_router.post("/room-types/{room_type_id}/images/", response_model=List[RoomTypeImageRead])
async def upload_room_type_images_landlord(
    room_type_id: UUID,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Upload images for a RoomType (Landlord only)
    """
    service = RoomService(session)
    return await service.add_room_type_images(room_type_id, files, current_user)


@room_landlord_router.post("/", response_model=RoomRead)
async def create_room_landlord(
    data: RoomCreate,
    current_user: User = Depends(get_current_landlord_or_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Landlord can create rooms for their hostels.
    """
    service = RoomService(session)
    return await service.create_room(data, current_user)


@room_landlord_router.patch("/{room_id}/", response_model=RoomRead)
async def update_room_landlord(
    room_id: UUID,
    data: RoomUpdate,
    current_user: User = Depends(get_current_landlord_or_admin),
    session: AsyncSession = Depends(get_session)
):
    service = RoomService(session)
    return await service.update_room(room_id, data, current_user)


@room_landlord_router.delete("/{room_id}/", status_code=204)
async def delete_room_landlord(
    room_id: UUID,
    current_user: User = Depends(get_current_landlord_or_admin),
    session: AsyncSession = Depends(get_session)
):
    service = RoomService(session)
    await service.delete_room(room_id, current_user)
    return {"detail": "Room deleted successfully"}


# ADMIN ROUTES
@room_admin_router.post("/", response_model=RoomRead)
async def create_room_admin(
    data: RoomCreate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Admin can create rooms for any hostel.
    """
    service = RoomService(session)
    return await service.create_room(data, current_user)


@room_admin_router.patch("/{room_id}/", response_model=RoomRead)
async def update_room_admin(
    room_id: UUID,
    data: RoomUpdate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    service = RoomService(session)
    return await service.update_room(room_id, data, current_user)


@room_admin_router.delete("/{room_id}/", status_code=204)
async def delete_room_admin(
    room_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    service = RoomService(session)
    await service.delete_room(room_id, current_user)
    return {"detail": "Room deleted successfully"}


# PUBLIC ROUTES
@room_public_router.get("/", response_model=List[RoomRead])
async def list_rooms(hostel_id: Optional[UUID] = Query(None), session: AsyncSession = Depends(get_session)):
    service = RoomService(session)
    return await service.list_rooms(hostel_id)


@room_public_router.get("/{room_id}/", response_model=RoomRead)
async def get_room_public(room_id: UUID, session: AsyncSession = Depends(get_session)):
    service = RoomService(session)
    return await service.get_room(room_id)