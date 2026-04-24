from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.hostels.service import HostelService, AmenityService
from app.hostels.schema import (
    HostelCreate, HostelFeaturedRead, HostelUpdate, HostelRead, HostelAdminRead,
    PaginatedHostels, PaginatedHostelsAdmin,
    AmenityCreate, AmenityRead, HostelCreateResponse
)
from .models import Hostel, HostelStatus
from app.user.models import User, UserRole
from app.user.dependencies import get_current_active_user, get_current_admin


async def get_hostel_service(
    session: AsyncSession = Depends(get_session)
) -> HostelService:
    return HostelService(session)

async def get_amenity_service(
    session: AsyncSession = Depends(get_session)
) -> AmenityService:
    hostel_service = HostelService(session)
    return AmenityService(session, hostel_service)


hostel_router = APIRouter(prefix="/hostels", tags=["Hostels"])
admin_hostel_router = APIRouter(prefix="/admin/hostels", tags=["Admin Hostels"])


# ============================================================
# PUBLIC ROUTES
# ============================================================

@hostel_router.get("/featured", response_model=List[HostelFeaturedRead])
async def get_featured_hostels(
    hostel_service: HostelService = Depends(get_hostel_service)
):
    hostels = await hostel_service.get_featured_hostels(limit=6)
    return [HostelFeaturedRead.model_validate(h) for h in hostels]


@hostel_router.get("/", response_model=List[HostelRead])
async def get_public_hostels(
    hostel_service: HostelService = Depends(get_hostel_service)
):
    result = await hostel_service.get_all_hostels(
        status=HostelStatus.APPROVED,
        include_blocks=False,
        include_count=False,
    )
    return [HostelRead.model_validate(h) for h in result.hostels]


# ✅ MUST be before /{hostel_id} to avoid route conflict
@hostel_router.get("/my-hostels", response_model=List[HostelRead])
async def get_my_hostels(
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns ALL hostels owned by the current landlord,
    regardless of status (PENDING, APPROVED, REJECTED, SUSPENDED).
    """
    if current_user.role not in [UserRole.LANDLORD, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords or admins can access this endpoint"
        )
    result = await hostel_service.get_all_hostels(
        owner_id=current_user.id,
        include_blocks=False,
        include_count=False,
    )
    return [HostelRead.model_validate(h) for h in result.hostels]


@hostel_router.get("/{hostel_id}", response_model=HostelRead)
async def get_hostel(
    hostel_id: UUID,
    hostel_service: HostelService = Depends(get_hostel_service)
):
    hostel = await hostel_service.get_hostel(hostel_id, include_blocks=False)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    return HostelRead.model_validate(hostel)


# ============================================================
# LANDLORD / OWNER ROUTES
# ============================================================

@hostel_router.post("/", response_model=HostelCreateResponse, status_code=201)
async def create_hostel(
    payload: HostelCreate,
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.LANDLORD, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords or admins can create hostels"
        )

    try:
        hostel = await hostel_service.create_hostel(
            data=payload,
            owner_id=current_user.id
        )
        await hostel_service.session.commit()
        await hostel_service.session.refresh(hostel)
        return hostel

    except ValueError as e:
        await hostel_service.session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        await hostel_service.session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@hostel_router.patch("/{hostel_id}", response_model=HostelRead)
async def update_hostel(
    hostel_id: UUID,
    payload: HostelUpdate = Body(...),
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    updates = payload.model_dump(exclude_unset=True)

    hostel = await hostel_service.get_hostel(hostel_id, include_blocks=False)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    if current_user.role != UserRole.ADMIN and hostel.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this hostel")
    if current_user.role != UserRole.ADMIN and "status" in updates:
        updates.pop("status")

    updated_hostel = await hostel_service.update_hostel(hostel_id, **updates)
    if not updated_hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    await hostel_service.session.commit()
    await hostel_service.session.refresh(updated_hostel)
    return HostelRead.model_validate(updated_hostel)


@hostel_router.delete("/{hostel_id}")
async def delete_hostel(
    hostel_id: UUID,
    hostel_service: HostelService = Depends(get_hostel_service),
    current_user: User = Depends(get_current_active_user)
):
    try:
        hostel = await hostel_service.get_hostel(hostel_id, include_blocks=False)
        if not hostel:
            raise HTTPException(status_code=404, detail="Hostel not found")
        if current_user.role != UserRole.ADMIN and hostel.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this hostel")

        success = await hostel_service.delete_hostel(hostel_id)
        if not success:
            raise HTTPException(status_code=400, detail="Delete failed")

        await hostel_service.session.commit()
        return {"success": True, "message": "Hostel deleted successfully"}

    except HTTPException:
        await hostel_service.session.rollback()
        raise

    except Exception as e:
        await hostel_service.session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN ROUTES
# ============================================================

@admin_hostel_router.get("/", response_model=PaginatedHostelsAdmin)
async def admin_get_all_hostels(
    limit: int = 50,
    offset: int = 0,
    status: Optional[HostelStatus] = None,
    hostel_service: HostelService = Depends(get_hostel_service),
    _: User = Depends(get_current_admin)
):
    result = await hostel_service.get_all_hostels(
        limit=limit,
        offset=offset,
        status=status,
        include_blocks=True,
        include_count=True,
    )
    result.hostels = [HostelAdminRead.model_validate(h) for h in result.hostels]
    return result


@admin_hostel_router.patch("/{hostel_id}", response_model=HostelAdminRead)
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
    return HostelAdminRead.model_validate(updated_hostel)


@admin_hostel_router.patch("/{hostel_id}/featured")
async def set_hostel_featured(
    hostel_id: UUID,
    is_featured: bool = Body(..., embed=True),
    hostel_service: HostelService = Depends(get_hostel_service),
    _: User = Depends(get_current_admin)
):
    hostel = await hostel_service.set_featured(hostel_id, is_featured)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    await hostel_service.session.commit()
    await hostel_service.session.refresh(hostel)
    return {"success": True, "is_featured": hostel.is_featured, "hostel_id": hostel_id}


@admin_hostel_router.delete("/{hostel_id}")
async def admin_delete_hostel(
    hostel_id: UUID,
    hostel_service: HostelService = Depends(get_hostel_service),
    _: User = Depends(get_current_admin)
):
    hostel = await hostel_service.get_hostel(hostel_id, include_blocks=False)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    hostel.is_deleted = True
    await hostel_service.session.commit()
    await hostel_service.session.refresh(hostel)
    return {"success": True, "message": "Hostel marked as deleted by admin"}


# ============================================================
# AMENITY ROUTES
# ============================================================

amenity_router = APIRouter(prefix="/amenities", tags=["Amenities"])


@amenity_router.post("/", response_model=AmenityRead, status_code=201)
async def create_amenity(
    payload: AmenityCreate,
    amenity_service: AmenityService = Depends(get_amenity_service),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LANDLORD]:
        raise HTTPException(status_code=403, detail="Only landlords or admins can create amenities")

    amenity = await amenity_service.create_amenity(payload)
    await amenity_service.session.commit()
    await amenity_service.session.refresh(amenity)
    return amenity


@amenity_router.get("/", response_model=List[AmenityRead])
async def list_amenities(
    amenity_service: AmenityService = Depends(get_amenity_service)
):
    amenities = await amenity_service.list_amenities()
    return [AmenityRead.model_validate(a) for a in amenities]


@amenity_router.post("/{hostel_id}/{amenity_id}")
async def add_amenity_to_hostel(
    hostel_id: UUID,
    amenity_id: UUID,
    amenity_service: AmenityService = Depends(get_amenity_service),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LANDLORD]:
        raise HTTPException(status_code=403, detail="Only landlords or admins can modify hostel amenities")

    success = await amenity_service.add_amenity_to_hostel(hostel_id, amenity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Hostel not found")

    await amenity_service.session.commit()
    return {"message": "Amenity added to hostel"}


@amenity_router.delete("/{hostel_id}/{amenity_id}")
async def remove_amenity_from_hostel(
    hostel_id: UUID,
    amenity_id: UUID,
    amenity_service: AmenityService = Depends(get_amenity_service),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LANDLORD]:
        raise HTTPException(status_code=403, detail="Only landlords or admins can modify hostel amenities")

    success = await amenity_service.remove_amenity_from_hostel(hostel_id, amenity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Amenity not linked")

    await amenity_service.session.commit()
    return {"message": "Amenity removed from hostel"}