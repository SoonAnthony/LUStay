import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.user.models import User
from app.rooms.models import Room


class BookingStatus(str):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"   # deposit paid
    ACTIVE = "ACTIVE"         # full balance paid
    CANCELLED = "CANCELLED"


class Booking(SQLModel, table=True):
    __tablename__ = "bookings"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    user_id: uuid.UUID = Field(
        sa_column=Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    )

    room_id: uuid.UUID = Field(
        sa_column=Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False)
    )

    semester: str = Field(nullable=False)
    is_shared: bool = Field(default=False)

    # snapshot of student's payable price (solo = full, shared = share)
    total_price: int = Field(nullable=False)

    # deposit = 20% of total_price
    deposit_amount: int = Field(nullable=False)

    amount_paid: int = Field(default=0)
    status: str = Field(default=BookingStatus.PENDING)

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )

    # Relationships
    user: Optional[User] = Relationship()
    room: Optional[Room] = Relationship()
    payments: List["Payment"] = Relationship(back_populates="booking")