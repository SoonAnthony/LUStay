import uuid
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Enum as SQLEnum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.user.models import User
import enum

from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.rooms.models import RoomType, Room

class HostelAmenity(SQLModel, table=True):

    __tablename__ = "hostel_amenities"

    hostel_id: uuid.UUID = Field(
        foreign_key="hostels.id",
        primary_key=True
    )

    amenity_id: uuid.UUID = Field(
        foreign_key="amenities.id",
        primary_key=True
    )


class Amenity(SQLModel, table=True):

    __tablename__ = "amenities"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    name: str = Field(index=True, unique=True)

    hostels: List["Hostel"] = Relationship(
        back_populates="amenities",
        link_model=HostelAmenity
    )


class HostelStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class Hostel(SQLModel, table=True):

    __tablename__ = "hostels"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    name: str
    description: Optional[str] = None
    location: str

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    status: HostelStatus = Field(
        sa_column=Column(
            SQLEnum(HostelStatus, name="hostel_status", native_enum=True, create_type=True),
            nullable=False,
            default=HostelStatus.PENDING
        )
    )

    owner_id: uuid.UUID = Field(
        foreign_key="users.id",
        nullable=False,
        index=True
    )

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )

    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False
        )
    )
    is_deleted: bool = Field(default=False)
    is_featured: bool = Field(default=False)

    # -----------------------------
    # Relationships
    # -----------------------------

    owner: Optional["User"] = Relationship(back_populates="hostels")
    images: List["HostelImage"] = Relationship(back_populates="hostel")
    blocks: List["HostelBlock"] = Relationship(back_populates="hostel")
    amenities: List["Amenity"] = Relationship(
        back_populates="hostels",
        link_model=HostelAmenity
    )
    room_types: List["RoomType"] = Relationship(back_populates="hostel")
    rooms: List["Room"] = Relationship(back_populates="hostel")
    


class HostelImage(SQLModel, table=True):

    __tablename__ = "hostel_images"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    hostel_id: uuid.UUID = Field(
        foreign_key="hostels.id",
        nullable=False,
        index=True
    )

    image_url: str
    public_id: str
    is_primary: bool = Field(default=False)

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )

    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False
        )
    )

    hostel: Optional["Hostel"] = Relationship(back_populates="images")


class HostelBlock(SQLModel, table=True):

    __tablename__ = "hostel_blocks"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    hostel_id: uuid.UUID = Field(
        foreign_key="hostels.id",
        nullable=False,
        index=True
    )

    data: str  # JSON snapshot of hostel state
    previous_hash: Optional[str] = None
    hash: str

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )

    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False
        )
    )

    hostel: Optional["Hostel"] = Relationship(back_populates="blocks")


