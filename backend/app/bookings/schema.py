import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from app.payments.schema import validate_kenyan_phone


class ReservationCreate(BaseModel):
    room_id: uuid.UUID
    semester: str
    is_shared: bool
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return validate_kenyan_phone(v)


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
    mpesa_checkout_request_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ReservationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    room_id: uuid.UUID
    semester: str
    is_shared: bool
    status: str
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)