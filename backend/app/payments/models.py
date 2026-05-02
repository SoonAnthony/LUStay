import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

if TYPE_CHECKING:
    from app.user.models import User
    from app.bookings.models import Booking


class PaymentStatus(str, Enum):
    PENDING          = "PENDING"
    SUCCESS          = "SUCCESS"
    FAILED           = "FAILED"
    REFUND_REQUESTED = "REFUND_REQUESTED"
    REFUNDED         = "REFUNDED"
    REFUND_REJECTED  = "REFUND_REJECTED"


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False),
    )

    # SET NULL: keep payment record even if booking is deleted
    booking_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("bookings.id", ondelete="SET NULL"),
            nullable=True,
            index=True
        )
    )

    amount: int = Field(nullable=False)
    phone_number: str = Field(nullable=False)
    status: str = Field(default=PaymentStatus.PENDING)

    transaction_ref: Optional[str] = None
    checkout_request_id: Optional[str] = None

    # SET NULL: keep payment record even if the requesting user is deleted
    refund_requested_by: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True
        )
    )

    # SET NULL: keep payment record even if the approving admin is deleted
    refund_approved_by: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True
        )
    )

    refund_reason: Optional[str] = None
    refunded_at: Optional[datetime] = None

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        )
    )

    # Relationships
    booking: Optional["Booking"] = Relationship(back_populates="payments")
    requested_by: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Payment.refund_requested_by]"}
    )
    approved_by: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Payment.refund_approved_by]"}
    )