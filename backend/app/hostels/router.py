from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.hostels.service import HostelService, AmenityService
from app.hostels.schema import HostelCreate, HostelUpdate, HostelRead, PaginatedHostels, AmenityCreate, AmenityRead, HostelCreateResponse
from .models import Hostel, HostelStatus
from app.user.models import User, UserRole
from app.user.dependencies import get_current_active_user, get_current_admin


# -------------------------------------------------
# Dependency to provide a HostelService instance and AmenityService instance
# -------------------------------------------------
async def get_hostel_service(
    session: AsyncSession = Depends(get_session)
) -> HostelService:
    return HostelService(session)

async def get_amenity_service(
    session: AsyncSession = Depends(get_session)
) -> AmenityService:
    hostel_service = HostelService(session)
    return AmenityService(session, hostel_service)
# -------------------------------------------------
# Routers
# -------------------------------------------------
hostel_router = APIRouter(prefix="/hostels", tags=["Hostels"])
admin_hostel_router = APIRouter(prefix="/admin/hostels", tags=["Admin Hostels"])


# ============================================================
# PUBLIC ROUTES
# ============================================================
@hostel_router.get("/", response_model=List[HostelRead])
async def get_public_hostels(
    hostel_service: HostelService = Depends(get_hostel_service)
):
    hostels = await hostel_service.get_all_hostels(status=HostelStatus.APPROVED)
    return hostels.hostels


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
@hostel_router.post("/", response_model=HostelCreateResponse, status_code=201)
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
    try:
        hostel = await hostel_service.create_hostel(
            data=payload,
            owner_id=current_user.id
        )

        # Commit and refresh
        await hostel_service.session.commit()
        await hostel_service.session.refresh(hostel)

    except ValueError as e:
        # Raised if an invalid amenity ID is provided
        await hostel_service.session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch any other DB errors
        await hostel_service.session.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    return hostel


@hostel_router.patch("/{hostel_id}", response_model=HostelRead)
async def update_hostel(
    hostel_id: UUID,
    payload: HostelUpdate = Body(...),
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    hostel = await hostel_service.get_hostel(hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    # Only admins or the hostel owner can update
    if current_user.role != UserRole.ADMIN and hostel.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this hostel"
        )

    # Convert payload to dict and remove unset fields (for partial update)
    updates = payload.model_dump(exclude_unset=True)

    # Admins can update everything including status; landlords cannot update status
    if current_user.role != UserRole.ADMIN and "status" in updates:
        updates.pop("status")

    updated_hostel = await hostel_service.update_hostel(hostel_id, **updates)
    await hostel_service.session.commit()
    await hostel_service.session.refresh(updated_hostel)

    return updated_hostel


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
@admin_hostel_router.get("/", response_model=PaginatedHostels)
async def admin_get_all_hostels(
    limit: int = 50,
    offset: int = 0,
    status: Optional[HostelStatus] = None,
    hostel_service: HostelService = Depends(get_hostel_service),
    _: User = Depends(get_current_admin)
):
    return await hostel_service.get_all_hostels(
        limit=limit,
        offset=offset,
        status=status
    )

@admin_hostel_router.patch("/{hostel_id}", response_model=HostelRead)
async def admin_update_hostel(
    hostel_id: UUID,
    payload: HostelUpdate = Body(...),
    hostel_service: HostelService = Depends(get_hostel_service),
    _: User = Depends(get_current_admin)
):
    updates = payload.model_dump(exclude_unset=True)
    updated_hostel = await hostel_service.update_hostel(hostel_id, **updates)
    if not updated_hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    await hostel_service.session.commit()
    await hostel_service.session.refresh(updated_hostel)

    return updated_hostel



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

#routes for amenities
amenity_router = APIRouter(prefix="/amenities", tags=["Amenities"])

#route to create amenity
@amenity_router.post("/", response_model=AmenityRead, status_code=201)
async def create_amenity(
    payload: AmenityCreate,
    amenity_service: AmenityService = Depends(get_amenity_service),
    current_user: User = Depends(get_current_active_user)
):

    if current_user.role not in [UserRole.ADMIN, UserRole.LANDLORD]:
        raise HTTPException(
            status_code=403,
            detail="Only landlords or admins can create amenities"
        )

    amenity = await amenity_service.create_amenity(payload)

    await amenity_service.session.commit()
    await amenity_service.session.refresh(amenity)

    return amenity

#route to list amenities
@amenity_router.get("/", response_model=List[AmenityRead])
async def list_amenities(
    amenity_service: AmenityService = Depends(get_amenity_service)
):
    amenities = await amenity_service.list_amenities()
    return amenities

#route to add amenity to hostel
@amenity_router.post("/{hostel_id}/{amenity_id}")
async def add_amenity_to_hostel(
    hostel_id: UUID,
    amenity_id: UUID,
    amenity_service: AmenityService = Depends(get_amenity_service),
    current_user: User = Depends(get_current_active_user)
):

    if current_user.role not in [UserRole.ADMIN, UserRole.LANDLORD]:
        raise HTTPException(
            status_code=403,
            detail="Only landlords or admins can modify hostel amenities"
        )

    success = await amenity_service.add_amenity_to_hostel(hostel_id, amenity_id)

    if not success:
        raise HTTPException(status_code=404, detail="Hostel not found")

    await amenity_service.session.commit()

    return {"message": "Amenity added to hostel"}

#route to remove amenity from hostel
@amenity_router.delete("/{hostel_id}/{amenity_id}")
async def remove_amenity_from_hostel(
    hostel_id: UUID,
    amenity_id: UUID,
    amenity_service: AmenityService = Depends(get_amenity_service),
    current_user: User = Depends(get_current_active_user)
):

    if current_user.role not in [UserRole.ADMIN, UserRole.LANDLORD]:
        raise HTTPException(
            status_code=403,
            detail="Only landlords or admins can modify hostel amenities"
        )

    success = await amenity_service.remove_amenity_from_hostel(hostel_id, amenity_id)

    if not success:
        raise HTTPException(status_code=404, detail="Amenity not linked")

    await amenity_service.session.commit()

    return {"message": "Amenity removed from hostel"}