import cloudinary
import cloudinary.uploader
import cloudinary.api
from typing import List

# Configure Cloudinary
cloudinary.config(
    cloud_name="YOUR_CLOUD_NAME",
    api_key="YOUR_API_KEY",
    api_secret="YOUR_API_SECRET",
    secure=True
)

def upload_image(file, folder: str = "hostels") -> dict:
    """
    Upload a single image to Cloudinary.
    
    Args:
        file: Upload file object (e.g., from FastAPI UploadFile)
        folder: Cloudinary folder to store the file

    Returns:
        Dict containing the uploaded file details (url, public_id, etc.)
    """
    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image"
    )
    return result

def upload_images(files: List, folder: str = "hostels") -> List[dict]:
    """
    Upload multiple images to Cloudinary
    """
    results = []
    for file in files:
        result = upload_image(file, folder)
        results.append(result)
    return results

def get_image_url(public_id: str, width: int = None, height: int = None, crop: str = None) -> str:
    """
    Generate a Cloudinary URL for a given public_id
    """
    url = cloudinary.CloudinaryImage(public_id).build_url(
        width=width,
        height=height,
        crop=crop
    )
    return url

def delete_image(public_id: str) -> dict:
    """
    Delete an image from Cloudinary
    """
    result = cloudinary.uploader.destroy(public_id)
    return result