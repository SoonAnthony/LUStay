from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

import cloudinary.uploader

from app.db.engine import get_session
from app.hostels.service import HostelService, HostelImageService
from app.hostels.schema import HostelImageCreate, HostelImageRead
from app.user.dependencies import get_current_active_user
from app.user.models import User, UserRole
from app.hostels.models import HostelImage



async def get_hostel_service(
    session: AsyncSession = Depends(get_session)
) -> HostelService:
    return HostelService(session)


async def get_image_service(
    session: AsyncSession = Depends(get_session)
) -> HostelImageService:
    hostel_service = HostelService(session)
    return HostelImageService(session, hostel_service)


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

@image_router.delete("/images/{image_id}")
async def delete_hostel_image(
    image_id: UUID,
    services=Depends(get_services),
    current_user: User = Depends(get_current_active_user)
):
    hostel_service, image_service, session = services

    # Find the image
    result = await session.execute(
        select(HostelImage).where(HostelImage.id == image_id)
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Get hostel for authorization
    hostel = await hostel_service.get_hostel(image.hostel_id)

    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    # Authorization check
    if current_user.role != UserRole.ADMIN and hostel.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this image"
        )

    # Prevent deleting primary image (recommended)
    if image.is_primary:
        raise HTTPException(
            status_code=400,
            detail="Primary image cannot be deleted. Set another image as primary first."
        )

    # Delete from Cloudinary
    cloudinary.uploader.destroy(image.public_id)

    # Delete from database (this also logs blockchain history in service)
    await image_service.delete_image(image_id)

    await session.commit()

    return {"success": True, "message": "Image deleted successfully"}