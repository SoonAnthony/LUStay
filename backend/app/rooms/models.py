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

    # CASCADE: if hostel is deleted, its room types are deleted too
    hostel_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("hostels.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )
    )

    name: str
    capacity: int = Field(default=2)
    price_single: int
    price_double: int
    description: Optional[str] = None

    # Relationships
    hostel: Optional["Hostel"] = Relationship(back_populates="room_types")
    rooms: List["Room"] = Relationship(back_populates="room_type")
    images: List["RoomTypeImage"] = Relationship(back_populates="room_type")


class RoomTypeImage(SQLModel, table=True):
    __tablename__ = "room_type_images"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    # CASCADE: if room type is deleted, its images are deleted too
    room_type_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("room_types.id", ondelete="CASCADE"),
            nullable=False,
            index=True
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

    # CASCADE: if hostel is deleted, its rooms are deleted too
    hostel_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("hostels.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )
    )

    # CASCADE: if room type is deleted, its rooms are deleted too
    room_type_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("room_types.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )
    )

    room_number: str
    status: RoomStatus = Field(default=RoomStatus.AVAILABLE)
    occupants: int = Field(default=0)

    # Relationships
    hostel: Optional["Hostel"] = Relationship(back_populates="rooms")
    room_type: Optional["RoomType"] = Relationship(back_populates="rooms")