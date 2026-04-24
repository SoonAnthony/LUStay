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
    description: Optional[str] = None      # FIX: was missing default None
    location: str
    latitude: Optional[float] = None       # FIX: was missing default None
    longitude: Optional[float] = None      # FIX: was missing default None
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
    amenity_ids: Optional[List[UUID]] = None

    model_config = ConfigDict(from_attributes=True)

class HostelCreateResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None      # FIX: was non-optional — caused 500 if omitted
    location: str
    latitude: Optional[float] = None       # FIX: was non-optional — caused 500 if omitted
    longitude: Optional[float] = None      # FIX: was non-optional — caused 500 if omitted
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
    # no blocks here — prevents lazy-load crash on public routes

    model_config = ConfigDict(from_attributes=True)

class HostelAdminRead(HostelRead):
    blocks: Optional[List["HostelBlockRead"]] = []

class HostelFeaturedRead(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: HostelStatus
    is_featured: bool
    owner_id: UUID
    amenities: Optional[List[AmenityRead]] = []
    images: Optional[List["HostelImageRead"]] = []

    model_config = ConfigDict(from_attributes=True)

class PaginatedHostels(BaseModel):
    total: int
    limit: int
    offset: int
    hostels: List[HostelRead]

    model_config = ConfigDict(from_attributes=True)

class PaginatedHostelsAdmin(BaseModel):
    total: int
    limit: int
    offset: int
    hostels: List[HostelAdminRead]

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
    previous_hash: Optional[str] = None    # FIX: was missing default None
    hash: str

class HostelBlockCreate(HostelBlockBase):
    hostel_id: UUID

class HostelBlockRead(HostelBlockBase):
    id: UUID
    hostel_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)