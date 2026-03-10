from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.hostels.service import HostelService
from app.hostels.schema import (
    HostelCreate,
    HostelUpdate,
    HostelRead
)

from .models import Hostel
from app.user.models import User

from app.user.dependencies import (
    get_current_active_user,
    get_current_admin
)


hostel_router = APIRouter(prefix="/hostels", tags=["Hostels"])

hostel_service = HostelService()



@hostel_router.get("/", response_model=List[HostelRead])
async def get_all_hostels(
    session: AsyncSession = Depends(get_session)
):
    hostels = await hostel_service.get_all_hostels(session)
    return hostels


@hostel_router.get("/{hostel_id}", response_model=HostelRead)
async def get_hostel(
    hostel_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    hostel = await hostel_service.get_hostel(session, hostel_id)

    if not hostel:
        raise HTTPException(
            status_code=404,
            detail="Hostel not found"
        )

    return hostel



@hostel_router.post("/", response_model=HostelRead, status_code=201)
async def create_hostel(
    payload: HostelCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    hostel = await hostel_service.create_hostel(
        session,
        payload,
        current_user.id
    )

    await session.commit()
    await session.refresh(hostel)

    return hostel


@hostel_router.patch("/{hostel_id}", response_model=HostelRead)
async def update_hostel(
    hostel_id: UUID,
    payload: HostelUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):

    hostel = await hostel_service.get_hostel(session, hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if hostel.landlord_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this hostel"
        )

    hostel = await hostel_service.update_hostel(hostel, payload)

    await session.commit()
    await session.refresh(hostel)

    return hostel


@hostel_router.delete("/{hostel_id}")
async def delete_hostel(
    hostel_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):

    hostel = await hostel_service.get_hostel(session, hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if hostel.landlord_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this hostel"
        )

    await session.delete(hostel)
    await session.commit()

    return {
        "success": True,
        "message": "Hostel deleted successfully"
    }


admin_hostel_router = APIRouter(
    prefix="/admin/hostels",
    tags=["Admin Hostels"]
)


@admin_hostel_router.get("/", response_model=List[HostelRead])
async def admin_get_all_hostels(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    hostels = await hostel_service.get_all_hostels(session)
    return hostels


@admin_hostel_router.delete("/{hostel_id}")
async def admin_delete_hostel(
    hostel_id: UUID,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):

    hostel = await hostel_service.get_hostel(session, hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    await session.delete(hostel)
    await session.commit()

    return {
        "success": True,
        "message": "Hostel deleted by admin"
    }