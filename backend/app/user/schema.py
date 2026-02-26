from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from datetime import datetime
import uuid
from .models import UserRole
from typing import Optional
import re

class UserSchema(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    profile_image: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserSelfSchema(UserSchema):
    email: EmailStr
    phone_number: str
    role: UserRole
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None


# information that only admin can see about a user on top of the self schema
class AdminUserSchema(UserSelfSchema):
    is_suspended: bool


