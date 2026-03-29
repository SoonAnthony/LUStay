# cloudinary_services.py
import cloudinary.uploader
import asyncio
from typing import List

async def upload_image(file, folder: str = "hostels") -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: cloudinary.uploader.upload(file.file, folder=folder, resource_type="image")
    )

async def upload_images(files: List, folder: str = "hostels") -> List[dict]:
    return await asyncio.gather(*(upload_image(f, folder) for f in files))

def delete_image(public_id: str) -> dict:
    return cloudinary.uploader.destroy(public_id)