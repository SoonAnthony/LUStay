from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
import uuid
from .models import UserRole
from typing import Optional

class UserSchema(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    profile_image: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


