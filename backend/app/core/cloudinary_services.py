import cloudinary
import cloudinary.uploader
import cloudinary.api
import asyncio
from typing import List

cloudinary.config(
    cloud_name="YOUR_CLOUD_NAME",
    api_key="YOUR_API_KEY",
    api_secret="YOUR_API_SECRET",
    secure=True
)

async def upload_image(file, folder: str = "hostels") -> dict:
    """
    Upload a single image asynchronously to Cloudinary.
    """
    loop = asyncio.get_event_loop()
    # For UploadFile, use file.file which is a SpooledTemporaryFile
    return await loop.run_in_executor(
        None,
        lambda: cloudinary.uploader.upload(file.file, folder=folder, resource_type="image")
    )

async def upload_images(files: List, folder: str = "hostels") -> List[dict]:
    results = []
    for file in files:
        result = await upload_image(file, folder)
        results.append(result)
    return results

def delete_image(public_id: str) -> dict:
    """
    Synchronous delete is fine.
    """
    return cloudinary.uploader.destroy(public_id)