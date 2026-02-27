from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, text, Index
from sqlalchemy import Column, func, DateTime
from sqlalchemy.dialects.postgresql import ENUM as PGEnum, UUID
import enum
import uuid
from datetime import datetime
from pydantic import EmailStr


# User Role Enum
class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    LANDLORD = "LANDLORD"
    ADMIN = "ADMIN"


# User Model
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    first_name: str = Field(nullable=False, max_length=50, index=True)
    last_name: str = Field(nullable=False, max_length=50, index=True)

    email: EmailStr = Field(
        nullable=False,
        index=True,
        unique=True,
        max_length=150
    )

    password_hash: str = Field(nullable=False, exclude=True)

    phone_number: str = Field(
        nullable=False,
        max_length=13,
        index=True,
        unique=True,
        description="Kenyan phone number 07XXX or +2547XXX"
    )

    profile_image: Optional[str] = Field(default=None)

    role: UserRole = Field(
        sa_column=Column(
            PGEnum(UserRole, name="userrole"),
            server_default="STUDENT",
            nullable=False
        ),
    )

    is_verified: bool = Field(default=False, nullable=False)
    is_suspended: bool = Field(default=False, nullable=False)

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

    last_login: Optional[datetime] = Field(default=None)
    
    # Temporary fields for email/phone verification
    pending_email: Optional[str] = Field(default=None, max_length=150)
    pending_phone: Optional[str] = Field(default=None, max_length=13)
    email_otp: Optional[str] = Field(default=None, max_length=6)
    phone_otp: Optional[str] = Field(default=None, max_length=6)
    otp_expiry: Optional[datetime] = Field(default=None)

    
    # Relationships
    
    # Requests made by this user
    landlord_requests: List["LandlordRequest"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[LandlordRequest.user_id]"}  
    )

    # Requests reviewed by this user (if admin)
    reviewed_requests: List["LandlordRequest"] = Relationship(
        back_populates="admin",
        sa_relationship_kwargs={"foreign_keys": "[LandlordRequest.admin_id]"}
    )

    def __repr__(self):
        return f"<User(email={self.email}, role={self.role})>"


# Landlord Request Status Enum
# ----------------------------
class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# LandlordRequest Model

class LandlordRequest(SQLModel, table=True):
    __tablename__ = "landlord_requests"
    __table_args__ = (
        Index(
            "uq_pending_request_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'PENDING'::requeststatus")
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    )

    # User who made the request
    user_id: uuid.UUID = Field(
        foreign_key="users.id",  
        nullable=False
    )
    user: Optional[User] = Relationship(
        back_populates="landlord_requests",
        sa_relationship_kwargs={"foreign_keys": "[LandlordRequest.user_id]"}
    )

    # Admin who approved/rejected
    admin_id: Optional[uuid.UUID] = Field(
        foreign_key="users.id",
        default=None,
        nullable=True
    )
    admin: Optional[User] = Relationship(
        back_populates="reviewed_requests",
        sa_relationship_kwargs={"foreign_keys": "[LandlordRequest.admin_id]"}
    )

    status: RequestStatus = Field(
        sa_column=Column(
            PGEnum(RequestStatus, name="requeststatus"),
            server_default="PENDING",
            nullable=False,
            index=True
        ),
    )

    requested_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )

    reviewed_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True)
    )

    reason: Optional[str] = Field(default=None, max_length=255)


    def __repr__(self):
        return f"<LandlordRequest(user_id={self.user_id}, status={self.status})>"