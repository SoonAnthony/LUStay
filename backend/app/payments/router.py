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

payments_router = APIRouter(prefix="/payments", tags=["Payments"])

    
@payments_router.post("/initiate", response_model=PaymentRead)
async def initiate(data: PaymentInitiate, session: AsyncSession = Depends(get_session)):
    payment = await initiate_payment(session, data.booking_id, data.phone_number)
    return payment


@payments_router.post("/callback")
async def callback(request: Request, session: AsyncSession = Depends(get_session)):
    payload = await request.json()
    payment = await handle_callback(session, payload)
    return {"status": "ok", "payment_id": str(payment.id)}


@payments_router.post("/{payment_id}/request-refund", response_model=PaymentRead)
async def refund_request(
    payment_id: str,
    data: RefundRequestSchema,
    session: AsyncSession = Depends(get_session),
):
    payment = await request_refund(session, payment_id, data.payment_id, data.reason)
    return payment


@payments_router.post("/{payment_id}/process-refund", response_model=PaymentRead)
async def refund_process(
    payment_id: str,
    data: RefundApprovalSchema,
    session: AsyncSession = Depends(get_session),
):
    payment = await process_refund(session, payment_id, data.payment_id, data.approve)
    return payment