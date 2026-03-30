from typing import List, Optional
import uuid
from pydantic import BaseModel, Field as PydanticField, ConfigDict
from app.rooms.models import RoomStatus

# RoomTypeImage Schemas
class RoomTypeImageBase(BaseModel):
    image_url: str

class RoomTypeImageCreate(RoomTypeImageBase):
    room_type_id: uuid.UUID

class RoomTypeImageRead(RoomTypeImageBase):
    id: uuid.UUID
    room_type_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)




# RoomType Schemas
class RoomTypeBase(BaseModel):
    name: str  # "Self" or "Single"
    capacity: int = 2
    price_single: int
    price_double: int
    description: Optional[str] = None

class RoomTypeCreate(RoomTypeBase):
    hostel_id: uuid.UUID

class RoomTypeRead(RoomTypeBase):
    id: uuid.UUID
    hostel_id: uuid.UUID
    images: Optional[List[RoomTypeImageRead]] = None


    model_config = ConfigDict(from_attributes=True)


# Room Schemas
class RoomBase(BaseModel):
    room_number: str
    status: Optional[RoomStatus] = RoomStatus.AVAILABLE
    occupants: Optional[int] = 0

class RoomCreate(RoomBase):
    hostel_id: uuid.UUID
    room_type_id: uuid.UUID

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    status: Optional[RoomStatus] = None
    occupants: Optional[int] = None

class RoomRead(RoomBase):
    id: uuid.UUID
    hostel_id: uuid.UUID
    room_type_id: uuid.UUID
    room_type: Optional[RoomTypeRead] = None

    model_config = ConfigDict(from_attributes=True)