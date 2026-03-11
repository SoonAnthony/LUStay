from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

import cloudinary.uploader

from app.db.engine import get_session
from app.hostels.service import HostelService, HostelImageService
from app.hostels.schema import HostelImageCreate, HostelImageRead
from app.hostels.models import Hostel
from app.user.dependencies import get_current_active_user
from app.user.models import User, UserRole


image_router = APIRouter(
    prefix="/hostels",
    tags=["Hostel Images"]
)


async def get_services(session: AsyncSession = Depends(get_session)):
    hostel_service = HostelService(session)
    image_service = HostelImageService(session, hostel_service)
    return hostel_service, image_service, session


# ============================================================
# Upload Images
# ============================================================
@image_router.post(
    "/{hostel_id}/images",
    response_model=List[HostelImageRead],
    status_code=201
)
async def upload_hostel_images(
    hostel_id: UUID,
    files: List[UploadFile] = File(...),
    services=Depends(get_services),
    current_user: User = Depends(get_current_active_user)
):

    hostel_service, image_service, session = services

    hostel = await hostel_service.get_hostel(hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if current_user.role != UserRole.ADMIN and hostel.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to upload images for this hostel"
        )

    uploaded_images = []

    for file in files:

        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file.file,
            folder=f"hostels/{hostel_id}"
        )

        image_data = HostelImageCreate(
            hostel_id=hostel_id,
            image_url=result["secure_url"],
            public_id=result["public_id"],
            is_primary=False
        )

        image = await image_service.add_image(image_data)

        uploaded_images.append(image)

    await session.commit()

    for img in uploaded_images:
        await session.refresh(img)

    return uploaded_images