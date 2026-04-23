from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import cloudinary.uploader

from app.db.engine import get_session
from app.user.dependencies import get_current_active_user
from app.user.models import User

document_router = APIRouter(prefix="/users", tags=["Document Upload"])


@document_router.post("/me/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a document to Cloudinary and return the URL + public_id.
    The frontend then uses these values to submit a landlord request.
    Accepted: PDF, JPEG, PNG, WebP.
    """
    ALLOWED_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    ]

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPEG, PNG, or WebP files are allowed"
        )

    # Max 10MB
    MAX_SIZE = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 10MB")

    # Reset file pointer after reading
    await file.seek(0)

    try:
        # Use raw=True for PDFs so Cloudinary stores them as-is
        is_pdf = file.content_type == "application/pdf"

        result = cloudinary.uploader.upload(
            contents,
            folder=f"landlord_documents/{current_user.id}",
            resource_type="raw" if is_pdf else "image",
            overwrite=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")

    return {
        "url":       result["secure_url"],
        "public_id": result["public_id"],
    }