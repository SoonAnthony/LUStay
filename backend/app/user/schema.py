from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from datetime import datetime
import uuid

from sqlmodel import SQLModel
from .models import UserRole, RequestStatus
from typing import Optional, List
import re


def validate_kenyan_phone(value: str) -> str:
    value = value.strip().replace(" ", "")
    pattern = r"^(?:\+254|254|0)?(7\d{8}|1\d{8})$"
    match = re.match(pattern, value)
    if not match:
        raise ValueError(
            "Invalid Kenyan phone number. "
            "Use format 07XXXXXXXX or +2547XXXXXXXX"
        )
    number_part = match.group(1)
    return f"+254{number_part}"


def validate_password_strength(value: str) -> str:
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
        raise ValueError("Password must contain at least one special character")
    return value


class UserSchema(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    profile_image: Optional[str] = None
    email: EmailStr
    phone_number: str

    model_config = ConfigDict(from_attributes=True)


class UserSelfSchema(UserSchema):
    role: UserRole
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None


class AdminUserSchema(UserSelfSchema):
    is_suspended: bool


class UserCreateSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return validate_kenyan_phone(value)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class UserUpdateSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image: Optional[str] = None


class AdminUserUpdateSchema(UserUpdateSchema):
    is_suspended: Optional[bool] = None
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = None


class RequestEmailChangeSchema(BaseModel):
    new_email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class RequestPhoneChangeSchema(BaseModel):
    new_phone: str
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return validate_kenyan_phone(value)


class ChangePasswordSchema(BaseModel):
    current_password: str = Field(..., min_length=8, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class PaginatedUsers(BaseModel):
    total: int
    limit: int
    offset: int
    users: List[AdminUserSchema]


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginSchema(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LandlordRequestCreate(BaseModel):
    title_deed_url: str
    title_deed_public_id: str
    lease_agreement_url: str
    lease_agreement_public_id: str
    authorization_letter_url: str
    authorization_letter_public_id: str

    model_config = ConfigDict(from_attributes=True)


# ✅ Nested user info returned with each request
class LandlordRequestUserInfo(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class LandlordRequestRead(LandlordRequestCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    user: Optional[LandlordRequestUserInfo] = None  # ✅ nested user info
    status: RequestStatus
    rejection_reason: Optional[str]
    submitted_at: datetime
    reviewed_at: Optional[datetime]
    admin_id: Optional[uuid.UUID]


class LandlordRequestUpdate(BaseModel):
    status: RequestStatus
    rejection_reason: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str

    model_config = ConfigDict(from_attributes=True)


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)