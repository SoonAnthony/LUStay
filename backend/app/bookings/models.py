import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from enum import Enum

if TYPE_CHECKING:
    from app.user.models import User
    from app.rooms.models import Room
    from app.payments.models import Payment


class ReservationStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CONVERTED = "converted"


class Reservation(SQLModel, table=True):
    __tablename__ = "reservations"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    # CASCADE: if user is deleted, their reservations are deleted too
    user_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )
    )

    # CASCADE: if room is deleted, reservations for it are deleted too
    room_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("rooms.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )
    )

    semester: str = Field(nullable=False)
    is_shared: bool = Field(default=False)

    mpesa_checkout_request_id: str | None = Field(default=None, index=True)

    status: ReservationStatus = Field(default=ReservationStatus.ACTIVE)

    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )

    # Relationships
    user: Optional["User"] = Relationship()
    room: Optional["Room"] = Relationship()


class BookingStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"


class Booking(SQLModel, table=True):
    __tablename__ = "bookings"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    # CASCADE: if user is deleted, their bookings are deleted too
    user_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )
    )

    # CASCADE: if room is deleted, bookings for it are deleted too
    room_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("rooms.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )
    )

    semester: str = Field(nullable=False)
    is_shared: bool = Field(default=False)

    total_price: int = Field(nullable=False)
    deposit_amount: int = Field(nullable=False)
    amount_paid: int = Field(default=0)

    status: str = Field(default=BookingStatus.CONFIRMED)

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )

    # Relationships
    user: Optional["User"] = Relationship()
    room: Optional["Room"] = Relationship()
    payments: List["Payment"] = Relationship(back_populates="booking")