import asyncio
import io
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
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    # ✅ Read bytes async FIRST before touching any sync code
    file_bytes = await file.read()

    if current_user.profile_image:
        try:
            public_id = f"users/{current_user.id}/profile"
            # ✅ Run sync Cloudinary call off the event loop
            await asyncio.to_thread(cloudinary.uploader.destroy, public_id)
        except Exception:
            pass

    try:
        # ✅ Run sync Cloudinary call off the event loop
        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            io.BytesIO(file_bytes),          # ✅ wrap bytes in a seekable stream
            folder=f"users/{current_user.id}",
            public_id="profile",
            overwrite=True,
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"}
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

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
        # ✅ Run sync Cloudinary call off the event loop
        await asyncio.to_thread(cloudinary.uploader.destroy, public_id)
    except Exception:
        pass

    current_user.profile_image = None
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    return UserSchema.model_validate(current_user)