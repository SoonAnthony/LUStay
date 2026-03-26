from datetime import datetime
from typing import Optional, List
import uuid
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint, Column, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ENUM as PGEnum
import enum
from sqlalchemy import ForeignKey
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.hostels.models import Hostel

class RoomStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_OCCUPIED = "PARTIALLY_OCCUPIED"
    FULLY_OCCUPIED = "FULLY_OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class Room(SQLModel, table=True):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("hostel_id", "room_number", name="unique_room_per_hostel"),
        CheckConstraint("capacity IN (1,2)", name="check_room_capacity"),
        CheckConstraint("current_occupancy >= 0", name="check_occupancy_non_negative"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )

    hostel_id: uuid.UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("hostels.id"),
            nullable=False
        )
    )

    room_number: str

    capacity: int  # 1 or 2

    price_single: int
    price_double: Optional[int] = None

    status: RoomStatus = Field(
        default=RoomStatus.AVAILABLE,
        sa_column=Column(
            PGEnum(RoomStatus, name="room_status_enum", native_enum=True, create_type=True),
            nullable=False
        ),
        description="System-controlled field. Do not set manually."
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column_kwargs={"onupdate": datetime.utcnow}
    )

    # 🔗 Relationships
    hostel: Optional["Hostel"] = Relationship(back_populates="rooms")
    images: List["RoomImage"] = Relationship(
        back_populates="room",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    current_occupancy: int = Field(default=0, nullable=False)
    is_under_maintenance: bool = Field(default=False, nullable=False)
    owner_id: uuid.UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("users.id"),
            nullable=False
        )
    )


class RoomImage(SQLModel, table=True):
    __tablename__ = "room_images"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True)
    )

    room_id: uuid.UUID = Field(
            sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False)
        )

    image_url: str
    image_type: Optional[str] = Field(
        default=None,
        description="Optional: type of image, e.g., bathroom, bed, sink"
    )
    public_id: Optional[str] = Field(
        default=None,
        description="Public ID from Cloudinary for easier deletion"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 🔗 Relationship
    room: Optional[Room] = Relationship(back_populates="images")