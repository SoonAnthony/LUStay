# backend/app/rooms/models.py
from typing import List, Optional
import uuid
import enum
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.hostels.models import Hostel

class RoomStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_OCCUPIED = "PARTIALLY_OCCUPIED"
    FULLY_OCCUPIED = "FULLY_OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class RoomType(SQLModel, table=True):
    __tablename__ = "room_types"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )
    hostel_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("hostels.id"),
            nullable=False
        )
    )
    name: str  # "Self" or "Single"
    capacity: int = Field(default=2)  # max occupants
    price_single: int  # price if booked alone
    price_double: int  # total price if shared
    description: Optional[str] = None

    # Relationships
    hostel: Optional["Hostel"] = Relationship(back_populates="room_types")
    rooms: List["Room"] = Relationship(back_populates="room_type")
    images: List["RoomTypeImage"] = Relationship(
        back_populates="room_type",
    )



class RoomTypeImage(SQLModel, table=True):
    __tablename__ = "room_type_images"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )
    room_type_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("room_types.id"),
            nullable=False
        )
    )
    image_url: str
  

    # Relationships
    room_type: Optional["RoomType"] = Relationship(back_populates="images")


class Room(SQLModel, table=True):
    __tablename__ = "rooms"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )
    hostel_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("hostels.id"),
            nullable=False
        )
    )
    room_type_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("room_types.id"),
            nullable=False
        )
    )
    room_number: str
    status: RoomStatus = Field(default=RoomStatus.AVAILABLE)
    occupants: int = Field(default=0)  # 0, 1, or 2

    # Relationships
    hostel: Optional["Hostel"] = Relationship(back_populates="rooms")
    room_type: Optional["RoomType"] = Relationship(
        back_populates="rooms",
    )
