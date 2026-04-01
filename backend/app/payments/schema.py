import uuid
from datetime import datetime
from typing import Optional, Union, List, Any
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
    CallbackMetadata: Optional[CallbackMetadata]
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