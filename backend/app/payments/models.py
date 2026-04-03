import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.user.models import User

if TYPE_CHECKING:
    from app.bookings.models import Booking


class PaymentStatus(str):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUND_REQUESTED = "REFUND_REQUESTED"
    REFUNDED = "REFUNDED"
    REFUND_REJECTED = "REFUND_REJECTED"


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False),
    )

    booking_id: uuid.UUID = Field(foreign_key="bookings.id", nullable=True)

    amount: int = Field(nullable=False)
    phone_number: str = Field(nullable=False)
    status: str = Field(default=PaymentStatus.PENDING)

    transaction_ref: Optional[str] = None
    checkout_request_id: Optional[str] = None

    # Refund fields
    refund_requested_by: Optional[uuid.UUID] = Field(
        default=None, foreign_key="users.id"
    )
    refund_approved_by: Optional[uuid.UUID] = Field(
        default=None, foreign_key="users.id"
    )
    refund_reason: Optional[str] = None
    refunded_at: Optional[datetime] = None

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )

    # Relationships
    booking: Optional["Booking"] = Relationship(back_populates="payments")
    requested_by: Optional[User] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Payment.refund_requested_by"}
    )
    approved_by: Optional[User] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Payment.refund_approved_by"}
    )