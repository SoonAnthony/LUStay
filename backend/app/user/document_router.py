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

    is_pdf = file.content_type == "application/pdf"

    try:
        if is_pdf:
            # ── PDF upload ────────────────────────────────────────────
            # resource_type="image"    → Cloudinary serves with proper PDF
            #                            Content-Type (not forced download)
            # access_mode="public"     → fixes 401 — no auth needed to view
            # flags="attachment:false" → Content-Disposition: inline
            result = cloudinary.uploader.upload(
                contents,
                folder=f"landlord_documents/{current_user.id}",
                resource_type="image",
                format="pdf",
                flags="attachment:false",
                access_mode="public",       # ✅ fixes 401
                overwrite=False,
            )
        else:
            # ── Image upload (JPEG / PNG / WebP) ─────────────────────
            result = cloudinary.uploader.upload(
                contents,
                folder=f"landlord_documents/{current_user.id}",
                resource_type="image",
                access_mode="public",       # ✅ consistent — always public
                overwrite=False,
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")

    return {
        "url":       result["secure_url"],
        "public_id": result["public_id"],
    }