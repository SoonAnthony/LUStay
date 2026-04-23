from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import cloudinary.uploader

from app.db.engine import get_session
from app.user.dependencies import get_current_active_user
from app.user.models import User
from app.user.schema import UserSchema, UserSelfSchema

profile_image_router = APIRouter(prefix="/users", tags=["User Profile"])

@profile_image_router.post("/me/profile-image", response_model=UserSelfSchema)
async def upload_profile_image(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    # Delete old image from Cloudinary if exists
    if current_user.profile_image:
        try:
            # Extract public_id from URL
            public_id = f"users/{current_user.id}/profile"
            cloudinary.uploader.destroy(public_id)
        except Exception:
            pass  # Don't fail if old image deletion fails

    # Upload new image to Cloudinary
    try:
        result = cloudinary.uploader.upload(
            file.file,
            folder=f"users/{current_user.id}",
            public_id="profile",
            overwrite=True,                  # ✅ replaces old one automatically
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"}
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    # Save URL to user
    current_user.profile_image = result["secure_url"]
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    return UserSchema.model_validate(current_user)


@profile_image_router.delete("/me/profile-image", response_model=UserSelfSchema)
async def delete_profile_image(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.profile_image:
        raise HTTPException(status_code=404, detail="No profile image to delete")

    try:
        public_id = f"users/{current_user.id}/profile"
        cloudinary.uploader.destroy(public_id)
    except Exception:
        pass

    current_user.profile_image = None
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    return UserSchema.model_validate(current_user)