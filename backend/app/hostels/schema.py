from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, ConfigDict


# ================================
# Enums
# ================================
class HostelStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


# ================================
# Amenity Schemas
# ================================
class AmenityBase(BaseModel):
    name: str

class AmenityCreate(AmenityBase):
    pass

class AmenityRead(AmenityBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)


# ================================
# Hostel Schemas
# ================================
class HostelBase(BaseModel):
    name: str
    description: Optional[str]
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    status: HostelStatus = HostelStatus.PENDING
    is_featured: bool = False

class HostelCreate(HostelBase):
    amenity_ids: Optional[List[UUID]] = None

class HostelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[HostelStatus] = None
    amenity_ids: Optional[List[UUID]] = None  # update amenities

    model_config = ConfigDict(from_attributes=True)

class HostelCreateResponse(BaseModel):
    id: UUID
    name: str
    description: str
    location: str
    latitude: float
    longitude: float
    status: str
    is_featured: bool
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HostelRead(HostelBase):
    id: UUID
    owner_id: UUID
    amenities: Optional[List[AmenityRead]] = []
    images: Optional[List["HostelImageRead"]] = []
    blocks: Optional[List["HostelBlockRead"]] = []

    model_config = ConfigDict(from_attributes=True)

class PaginatedHostels(BaseModel):
    total: int
    limit: int
    offset: int
    hostels: List[HostelRead]

    model_config = ConfigDict(from_attributes=True)

# ================================
# Hostel Image Schemas
# ================================
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

    model_config = ConfigDict(from_attributes=True)


# ================================
# Hostel Block Schemas
# ================================
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

    model_config = ConfigDict(from_attributes=True)

