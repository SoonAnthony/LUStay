from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum, UUID
import enum
import uuid
from datetime import datetime
from pydantic import EmailStr


# user model

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    LANDLORD = "LANDLORD"
    ADMIN = "ADMIN"


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    )
    first_name: str = Field(nullable=False, max_length=50, index=True)
    last_name: str = Field(nullable=False, max_length=50, index=True)
    email: EmailStr = Field(nullable=False, index=True, unique=True, max_length=150)
    password_hash: str = Field(nullable=False, exclude=True)
    phone_number: str = Field(nullable=False, max_length=13, index=True, unique=True, description="Kenyan phone number 07XXX or +2547XXX")
    profile_image: Optional[str] = Field(default=None)
    role: UserRole = Field(
        sa_column=Column(PGEnum(UserRole, name="userrole"), default=UserRole.STUDENT, nullable=False),
        nullable=False
    )
    is_verified: bool = Field(default=False, nullable=False)
    is_suspended: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        sa_column=Column(
            datetime,
            default=func.now(),
            onupdate=func.now(),
            nullable=False
        )
    )
    last_login: Optional[datetime] = Field(default=None)

    def __repr__(self):
        return f"<User(email={self.email}, role={self.role})>"
