from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
import enum
import uuid


class RoomStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_OCCUPIED = "PARTIALLY_OCCUPIED"
    FULLY_OCCUPIED = "FULLY_OCCUPIED"
    MAINTENANCE = "MAINTENANCE"



class RoomImageBase(SQLModel):
    image_url: str
    image_type: Optional[str] = None  # e.g., bed, bathroom, sink

    class Config:
        from_attributes = True


class RoomImageCreate(RoomImageBase):
    pass


class RoomImageUpdate(RoomImageBase):
    pass


class RoomImageRead(RoomImageBase):
    id: uuid.UUID


class RoomPublicBase(SQLModel):
    room_number: str
    capacity: int
    price_single: int
    price_double: Optional[int] = None
    status: RoomStatus

    class Config:
        from_attributes = True


class RoomPublicRead(RoomPublicBase):
    id: uuid.UUID
    images: List[RoomImageRead] = []

    class Config:
        from_attributes = True


# ----------------------------
# Landlord Schemas
# ----------------------------
class RoomBookingRead(SQLModel):
    student_id: uuid.UUID
    is_shared: bool
    price_paid: int
    status: str  # pending, confirmed, adjusted
    partner_deadline: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoomLandlordRead(RoomPublicRead):
    bookings: List[RoomBookingRead] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoomCreate(SQLModel):
    room_number: str
    capacity: int
    price_single: int
    price_double: Optional[int] = None
    status: Optional[RoomStatus] = RoomStatus.AVAILABLE
    images: Optional[List[RoomImageCreate]] = []

    class Config:
        from_attributes = True


class RoomUpdate(SQLModel):
    room_number: Optional[str] = None
    capacity: Optional[int] = None
    price_single: Optional[int] = None
    price_double: Optional[int] = None
    status: Optional[RoomStatus] = None
    images: Optional[List[RoomImageUpdate]] = None

    class Config:
        from_attributes = True



class RoomAdminRead(RoomLandlordRead):
    hostel_id: uuid.UUID

    class Config:
        from_attributes = True