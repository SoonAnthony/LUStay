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

# Reservation
class ReservationStatus(str, Enum):
    ACTIVE = "active"       # Slot is held, awaiting payment
    EXPIRED = "expired"     # TTL passed, slot released
    CONVERTED = "converted" # Payment confirmed, booking created


class Reservation(SQLModel, table=True):
    __tablename__ = "reservations"

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

    # M-Pesa checkout request ID returned after STK push
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

# Booking
class BookingStatus(str, Enum):
    CONFIRMED = "CONFIRMED"   # deposit paid, booking secured
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

    # Snapshot of student's payable price (solo = full, shared = per-head share)
    total_price: int = Field(nullable=False)

    # Deposit = 20% of total_price
    deposit_amount: int = Field(nullable=False)

    amount_paid: int = Field(default=0)

    # Default is CONFIRMED since bookings only exist post-payment
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