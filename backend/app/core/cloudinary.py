from app.core.config import settings
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

print("CLOUDINARY_URL from env:", os.getenv("CLOUDINARY_URL"))

cloudinary.config(secure=True)

print("Cloudinary config check:", cloudinary.config())
