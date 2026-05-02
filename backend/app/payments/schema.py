import uuid
from datetime import datetime
from typing import Optional, Union, List, Any
from pydantic import BaseModel


# ✅ FIX: Renamed booking_id → reservation_id to match what the router actually fetches
class PaymentInitiate(BaseModel):
    reservation_id: uuid.UUID
    phone_number: str


# ✅ FIX: Added useful fields so the frontend gets actionable data back
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