import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel



class PaymentInitiate(BaseModel):
    booking_id: uuid.UUID
    phone_number: str



class PaymentRead(BaseModel):
    id: uuid.UUID
    amount: int
    status: str
    created_at: datetime


class RefundRequestSchema(BaseModel):
    payment_id: uuid.UUID
    reason: Optional[str] = None


class RefundApprovalSchema(BaseModel):
    payment_id: uuid.UUID
    approve: bool


class CallbackMetadataItem(BaseModel):
    Name: str
    Value: Optional[str]


class CallbackMetadata(BaseModel):
    Item: list[CallbackMetadataItem]


class STKCallback(BaseModel):
    MerchantRequestID: str
    CheckoutRequestID: str
    ResultCode: int
    ResultDesc: str
    CallbackMetadata: Optional[CallbackMetadata]


class STKCallbackBody(BaseModel):
    Body: STKCallback