# backend/app/rooms/models.py
from typing import List, Optional
import uuid
import enum
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.hostels.models import Hostel

class RoomStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_OCCUPIED = "PARTIALLY_OCCUPIED"
    FULLY_OCCUPIED = "FULLY_OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class RoomType(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )
    hostel_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("hostel.id"),
            nullable=False
        )
    )
    name: str  # "Self" or "Single"
    capacity: int = Field(default=2)  # max occupants
    price_single: int  # price if booked alone
    price_double: int  # total price if shared
    description: Optional[str] = None

    # Relationships
    hostel: Optional[Hostel] = Relationship(back_populates="room_types")
    rooms: List["Room"] = Relationship(back_populates="room_type")
    images: List["RoomTypeImage"] = Relationship(back_populates="room_type")


class RoomTypeImage(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )
    room_type_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("roomtype.id"),
            nullable=False
        )
    )
    image_url: str
  

    # Relationships
    room_type: Optional[RoomType] = Relationship(back_populates="images")


class Room(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )
    hostel_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("hostel.id"),
            nullable=False
        )
    )
    room_type_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("roomtype.id"),
            nullable=False
        )
    )
    room_number: str
    status: RoomStatus = Field(default=RoomStatus.AVAILABLE)
    occupants: int = Field(default=0)  # 0, 1, or 2

    # Relationships
    hostel: Optional[Hostel] = Relationship()
    room_type: Optional[RoomType] = Relationship(back_populates="rooms")