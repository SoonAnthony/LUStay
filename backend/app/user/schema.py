from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
import uuid
from .models import UserRole
from typing import Optional

class UserSchema(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    profile_image: Optional[str] | None
    role: UserRole
    is_verified: bool
    is_suspended: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] | None

    model_config = ConfigDict(from_attributes=True)