from typing import List, Optional
from datetime import datetime
from fastapi import UploadFile
import enum
import uuid
from pydantic import BaseModel, ConfigDict
from fastapi import File


class RoomStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_OCCUPIED = "PARTIALLY_OCCUPIED"
    FULLY_OCCUPIED = "FULLY_OCCUPIED"
    MAINTENANCE = "MAINTENANCE"



class RoomImageBase(BaseModel):
    image_type: Optional[str] = None  # e.g., bed, bathroom, sink


class RoomImageUpdate(RoomImageBase):
    pass


class RoomImageRead(RoomImageBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class RoomPublicBase(BaseModel):
    room_number: str
    capacity: int
    price_single: int
    price_double: Optional[int] = None
    status: RoomStatus



class RoomPublicRead(RoomPublicBase):
    id: uuid.UUID
    images: List[RoomImageRead] = []

    model_config = ConfigDict(from_attributes=True)


# Landlord Schemas

class RoomBookingRead(BaseModel):
    student_id: uuid.UUID
    is_shared: bool
    price_paid: int
    status: str  # pending, confirmed, adjusted
    partner_deadline: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoomLandlordRead(RoomPublicRead):
    bookings: List[RoomBookingRead] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoomCreate(BaseModel):
    room_number: str
    capacity: int
    price_single: int
    price_double: Optional[int] = None
    status: Optional[RoomStatus] = RoomStatus.AVAILABLE



class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    capacity: Optional[int] = None
    price_single: Optional[int] = None
    price_double: Optional[int] = None
    status: Optional[RoomStatus] = None
    images: Optional[List[RoomImageUpdate]] = None




class RoomAdminRead(RoomLandlordRead):
    hostel_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)