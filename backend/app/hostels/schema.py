from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel



class HostelStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class AmenityBase(BaseModel):
    name: str

class AmenityCreate(AmenityBase):
    pass

class AmenityRead(AmenityBase):
    id: UUID

    class Config:
        orm_mode = True



class HostelBase(BaseModel):
    name: str
    description: Optional[str]
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    status: HostelStatus = HostelStatus.PENDING

class HostelCreate(HostelBase):
    owner_id: UUID
    amenity_ids: Optional[List[UUID]] = []

class HostelRead(HostelBase):
    id: UUID
    owner_id: UUID
    amenities: Optional[List[AmenityRead]] = []
    images: Optional[List["HostelImageRead"]] = []
    blocks: Optional[List["HostelBlockRead"]] = []

    class Config:
        orm_mode = True



class HostelImageBase(BaseModel):
    image_url: str
    public_id: str
    is_primary: bool = False

class HostelImageCreate(HostelImageBase):
    hostel_id: UUID

class HostelImageRead(HostelImageBase):
    id: UUID
    hostel_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True



class HostelBlockBase(BaseModel):
    data: str
    previous_hash: Optional[str]
    hash: str

class HostelBlockCreate(HostelBlockBase):
    hostel_id: UUID

class HostelBlockRead(HostelBlockBase):
    id: UUID
    hostel_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True