from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.hostels.service import HostelService
from app.hostels.schema import HostelCreate, HostelUpdate, HostelRead, PaginatedHostels
from .models import Hostel
from app.user.models import User, UserRole
from app.user.dependencies import get_current_active_user, get_current_admin


# -------------------------------------------------
# Dependency to provide a HostelService instance
# -------------------------------------------------
async def get_hostel_service(
    session: AsyncSession = Depends(get_session)
) -> HostelService:
    return HostelService(session)


# -------------------------------------------------
# Routers
# -------------------------------------------------
hostel_router = APIRouter(prefix="/hostels", tags=["Hostels"])
admin_hostel_router = APIRouter(prefix="/admin/hostels", tags=["Admin Hostels"])


# ============================================================
# PUBLIC ROUTES
# ============================================================
@hostel_router.get("/", response_model=PaginatedHostels)
async def get_all_hostels(
    hostel_service: HostelService = Depends(get_hostel_service)
):
    hostels = await hostel_service.get_all_hostels()
    return hostels


@hostel_router.get("/{hostel_id}", response_model=HostelRead)
async def get_hostel(
    hostel_id: UUID,
    hostel_service: HostelService = Depends(get_hostel_service)
):
    hostel = await hostel_service.get_hostel(hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    return hostel


# ============================================================
# LANDLORD / ADMIN ROUTES
# ============================================================
@hostel_router.post("/", response_model=HostelRead, status_code=201)
async def create_hostel(
    payload: HostelCreate,
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    # Authorization check
    if current_user.role not in [UserRole.LANDLORD, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords or admins can create hostels"
        )

    # Create hostel
    hostel = await hostel_service.create_hostel(
        payload=payload,
        owner_id=current_user.id
    )

    await hostel_service.session.commit()
    await hostel_service.session.refresh(hostel)

    return hostel


@hostel_router.patch("/{hostel_id}", response_model=HostelRead)
async def update_hostel(
    hostel_id: UUID,
    payload: HostelUpdate,
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    hostel = await hostel_service.get_hostel(hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if current_user.role != UserRole.ADMIN and hostel.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this hostel"
        )

    hostel = await hostel_service.update_hostel(hostel_id, **payload.dict(exclude_unset=True))
    await hostel_service.session.commit()
    await hostel_service.session.refresh(hostel)

    return hostel


@hostel_router.delete("/{hostel_id}")
async def delete_hostel(
    hostel_id: UUID,
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    hostel = await hostel_service.get_hostel(hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if current_user.role != UserRole.ADMIN and hostel.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this hostel"
        )

    await hostel_service.delete_hostel(hostel_id)
    await hostel_service.session.commit()

    return {"success": True, "message": "Hostel deleted successfully"}


# ============================================================
# ADMIN ROUTES
# ============================================================
@admin_hostel_router.get("/", response_model=List[HostelRead])
async def admin_get_all_hostels(
    hostel_service: HostelService = Depends(get_hostel_service),
    _: User = Depends(get_current_admin)
):
    hostels = await hostel_service.get_all_hostels()
    return hostels


@admin_hostel_router.delete("/{hostel_id}")
async def admin_delete_hostel(
    hostel_id: UUID,
    hostel_service: HostelService = Depends(get_hostel_service),
    _: User = Depends(get_current_admin)
):
    hostel = await hostel_service.get_hostel(hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    await hostel_service.delete_hostel(hostel_id)
    await hostel_service.session.commit()

    return {"success": True, "message": "Hostel deleted by admin"}