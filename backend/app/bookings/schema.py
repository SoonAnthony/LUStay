import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BookingCreate(BaseModel):
    room_id: uuid.UUID
    semester: str
    is_shared: bool
    phone_number: str 

class BookingUpdate(BaseModel):
    room_id: uuid.UUID | None = None
    semester: str | None = None
    status: str | None = None

    model_config = ConfigDict(from_attributes=True)


class BookingRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    room_id: uuid.UUID
    semester: str
    is_shared: bool
    total_price: int
    deposit_amount: int
    amount_paid: int
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)