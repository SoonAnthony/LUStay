# backend/app/rooms/router.py
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.rooms.service import RoomService
from app.rooms.schema import (
    RoomTypeCreate,
    RoomTypeRead,
    RoomTypeImageRead,
    RoomCreate,
    RoomRead,
    RoomUpdate,
)
from app.user.dependencies import get_async_session, get_current_user
from app.user.models import User
from app.rooms.models import RoomType, Room

# ------------------------
# Routers
# ------------------------
room_public_router = APIRouter(prefix="/public/rooms", tags=["Public Rooms"])
room_landlord_router = APIRouter(prefix="/landlord/rooms", tags=["Landlord Rooms"])
room_admin_router = APIRouter(prefix="/admin/rooms", tags=["Admin Rooms"])

# Public Routes 
@room_public_router.get("/room-types/", response_model=List[RoomTypeRead])
async def list_room_types(hostel_id: Optional[UUID] = Query(None), session: AsyncSession = Depends(get_async_session)):
    service = RoomService(session)
    room_types = await service.list_room_types(hostel_id)
    return room_types

@room_public_router.get("/room-types/{room_type_id}/", response_model=RoomTypeRead)
async def get_room_type(room_type_id: UUID, session: AsyncSession = Depends(get_async_session)):
    service = RoomService(session)
    room_type = await service.get_room_type(room_type_id)
    if not room_type:
        raise HTTPException(status_code=404, detail="RoomType not found")
    return room_type

@room_public_router.get("/", response_model=List[RoomRead])
async def list_rooms(hostel_id: Optional[UUID] = Query(None), session: AsyncSession = Depends(get_async_session)):
    service = RoomService(session)
    rooms = await service.list_rooms(hostel_id)
    return rooms

@room_public_router.get("/{room_id}/", response_model=RoomRead)
async def get_room(room_id: UUID, session: AsyncSession = Depends(get_async_session)):
    service = RoomService(session)
    room = await service.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

# Landlord Routes
@room_landlord_router.post("/room-types/", response_model=RoomTypeRead)
async def create_room_type(
    data: RoomTypeCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if current_user.role != "LANDLORD":
        raise HTTPException(status_code=403, detail="Only landlords can create room types")
    service = RoomService(session)
    return await service.create_room_type(data, current_user)

@room_landlord_router.post("/room-types/{room_type_id}/images/", response_model=List[RoomTypeImageRead])
async def upload_roomtype_images(
    room_type_id: UUID,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if current_user.role != "LANDLORD":
        raise HTTPException(status_code=403, detail="Only landlords can upload images")
    service = RoomService(session)
    return await service.add_roomtype_images(room_type_id, files, current_user)

@room_landlord_router.post("/", response_model=RoomRead)
async def create_room(
    data: RoomCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if current_user.role != "LANDLORD":
        raise HTTPException(status_code=403, detail="Only landlords can create rooms")
    service = RoomService(session)
    return await service.create_room(data, current_user)

@room_landlord_router.patch("/{room_id}/", response_model=RoomRead)
async def update_room(
    room_id: UUID,
    data: RoomUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = RoomService(session)
    try:
        return await service.update_room(room_id, data, current_user)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@room_landlord_router.delete("/{room_id}/", status_code=204)
async def delete_room(
    room_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = RoomService(session)
    try:
        await service.delete_room(room_id, current_user)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

# 
# Admin Routes
@room_admin_router.post("/", response_model=RoomRead)
async def create_room_admin(
    data: RoomCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can create rooms here")
    service = RoomService(session)
    return await service.create_room(data, current_user)

@room_admin_router.patch("/{room_id}/", response_model=RoomRead)
async def update_room_admin(
    room_id: UUID,
    data: RoomUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can update rooms here")
    service = RoomService(session)
    return await service.update_room(room_id, data, current_user)

@room_admin_router.delete("/{room_id}/", status_code=204)
async def delete_room_admin(
    room_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete rooms here")
    service = RoomService(session)
    await service.delete_room(room_id, current_user)