import uuid
import re
from datetime import datetime
from typing import Optional, Union, List, Any
from pydantic import BaseModel, field_validator


def validate_kenyan_phone(phone: str) -> str:
    """
    Accepts:
      - 07XXXXXXXX  (Safaricom/Airtel 07xx)
      - 01XXXXXXXX  (Airtel 01xx/ Safaricom 01xx)
      - +2547XXXXXXX
      - +2541XXXXXXX
      - 2547XXXXXXX
      - 2541XXXXXXX
    Always returns in 2547XXXXXXXXX or 2541XXXXXXXXX format (no +)
    as required by Daraja STK push.
    """
    phone = phone.strip()
    # Strip leading +
    if phone.startswith("+"):
        phone = phone[1:]

    # Already in 254 format
    if re.fullmatch(r"254[71]\d{8}", phone):
        return phone

    # 07xx or 01xx → 254xx
    if re.fullmatch(r"0[71]\d{8}", phone):
        return "254" + phone[1:]

    raise ValueError(
        "Invalid Kenyan phone number. "
        "Use 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, or +2541XXXXXXXX."
    )


class PaymentInitiate(BaseModel):
    reservation_id: uuid.UUID
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return validate_kenyan_phone(v)


class PaymentRead(BaseModel):
    id: uuid.UUID
    booking_id: Optional[uuid.UUID] = None
    amount: int
    phone_number: str
    status: str
    transaction_ref: Optional[str] = None
    refund_reason: Optional[str] = None
    refunded_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RefundRequestSchema(BaseModel):
    reason: Optional[str] = None


class RefundApprovalSchema(BaseModel):
    approve: bool


class CallbackMetadataItem(BaseModel):
    Name: str
    Value: Optional[Any] = None

    class Config:
        extra = "allow"


class CallbackMetadata(BaseModel):
    Item: List[CallbackMetadataItem]

    class Config:
        extra = "allow"


class StkCallback(BaseModel):
    MerchantRequestID: str
    CheckoutRequestID: str
    ResultCode: int
    ResultDesc: str
    callbackMetadata: Optional[CallbackMetadata] = None

    class Config:
        extra = "allow"


class Body(BaseModel):
    stkCallback: StkCallback

    class Config:
        extra = "allow"


class STKCallbackBody(BaseModel):
    Body: Body

    class Config:
        extra = "allow"