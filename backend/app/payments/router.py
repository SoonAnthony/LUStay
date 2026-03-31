from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session

from app.db.engine import get_session
from app.payments.schema import (
    PaymentInitiate,
    PaymentRead,
    RefundRequestSchema,
    RefundApprovalSchema,
)
from app.payments.service import (
    initiate_payment,
    handle_callback,
    request_refund,
    process_refund,
)
from app.user.dependencies import (
    get_current_active_user,
    get_current_landlord_or_admin,
    get_current_admin,
)
from app.user.models import User
from app.payments.schema import STKCallbackBody


payments_router = APIRouter(prefix="/payments", tags=["Payments"])

    
@payments_router.post("/initiate", response_model=PaymentRead)
async def initiate(
    data: PaymentInitiate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),  
):
    payment = await initiate_payment(session, data.booking_id, data.phone_number)
    return payment


@payments_router.post("/callback")
async def callback(
    payload: STKCallbackBody,  
    session: AsyncSession = Depends(get_session),
):
    payment = await handle_callback(session, payload.dict())
    return {"status": "ok", "payment_id": str(payment.id)}



@payments_router.post("/{payment_id}/request-refund", response_model=PaymentRead)
async def refund_request(
    payment_id: str,
    data: RefundRequestSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),  
):
    payment = await request_refund(session, payment_id, current_user.id, data.reason)
    return payment


@payments_router.post("/{payment_id}/process-refund", response_model=PaymentRead)
async def refund_process(
    payment_id: str,
    data: RefundApprovalSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),  
):
    payment = await process_refund(session, payment_id, current_user.id, data.approve)
    return payment
