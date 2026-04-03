from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.engine import get_session
from app.payments.schema import (
    PaymentInitiate,
    PaymentRead,
    RefundRequestSchema,
    RefundApprovalSchema,
    STKCallbackBody,
)
from app.payments.service import (
    initiate_payment,
    handle_callback_logic,
    request_refund,
    process_refund,
)
from app.payments.models import Payment
from app.bookings.models import Reservation
from app.user.dependencies import (
    get_current_active_user,
    get_current_landlord_or_admin,
    get_current_admin,
)
from app.user.models import User


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
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    data = await request.json()
    print("RAW MPESA CALLBACK:", data)

    # Find payment and reservation by checkout ID
    checkout_id = payload.Body["stkCallback"]["CheckoutRequestID"]

    result = await session.exec(select(Payment).where(Payment.checkout_request_id == checkout_id))
    payment = result.first()
    result = await session.exec(select(Reservation).where(Reservation.mpesa_checkout_request_id == checkout_id))
    reservation = result.first()

    payment, booking, updated_reservation = await handle_callback_logic(payload.dict(), payment, reservation)

    objects = [payment]
    if booking:
        objects.append(booking)
    if updated_reservation:
        objects.append(updated_reservation)

    session.add_all(objects)
    await session.commit()
    await session.refresh(payment)

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