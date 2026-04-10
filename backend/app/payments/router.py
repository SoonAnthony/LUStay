from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import uuid
from app.db.engine import get_session
from app.payments.schema import (
    PaymentInitiate,
    PaymentRead,
    RefundRequestSchema,
    RefundApprovalSchema,
    STKCallbackBody,
)
from app.payments.service import (
    initiate_payment_logic,
    handle_callback_logic,
    request_refund_logic,
    process_refund_logic,
)
from app.payments.models import Payment
from app.bookings.models import Reservation, Booking
from app.rooms.models import Room
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
    # Find reservation
    reservation = await session.get(Reservation, data.booking_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # Run pure logic
    payment, reservation = await initiate_payment_logic(reservation, data.phone_number)

    # Commit here
    session.add_all([payment, reservation])
    await session.commit()
    await session.refresh(payment)
    await session.refresh(reservation)

    return payment


@payments_router.post("/callback")
async def callback(
    payload: STKCallbackBody,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    data = await request.json()
    print("RAW MPESA CALLBACK:", data)

    body = payload.dict().get("Body", {})
    stk_callback = body.get("stkCallback", {})
    checkout_id = stk_callback.get("CheckoutRequestID")

    # Find payment and reservation
    payment = (await session.exec(
        select(Payment).where(Payment.checkout_request_id == checkout_id)
    )).first()

    reservation = (await session.exec(
        select(Reservation).where(Reservation.mpesa_checkout_request_id == checkout_id)
    )).first()

    payment, booking, updated_reservation = await handle_callback_logic(
        payload.dict(), payment, reservation, session
    )

    # ✅ Persist booking first so it gets an ID
    objects = [payment]
    if booking:
        session.add(booking)
        await session.commit()
        await session.refresh(booking)

        # Now booking.id exists, link it to payment
        payment.booking_id = booking.id
        objects.append(payment)

    if updated_reservation:
        objects.append(updated_reservation)

    session.add_all(objects)
    await session.commit()

    await session.refresh(payment)
    if booking:
        await session.refresh(booking)

    return {"status": "ok", "payment_id": str(payment.id)}

@payments_router.post("/{payment_id}/request-refund", response_model=PaymentRead)
async def refund_request(
    payment_id: str,
    data: RefundRequestSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    payment = await session.get(Payment, uuid.UUID(payment_id))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Run pure logic
    payment = await request_refund_logic(payment, current_user.id, data.reason)

    # Commit here
    session.add(payment)
    await session.commit()
    await session.refresh(payment)

    return payment


@payments_router.post("/{payment_id}/process-refund", response_model=PaymentRead)
async def refund_process(
    payment_id: str,
    data: RefundApprovalSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
):
    payment = await session.get(Payment, uuid.UUID(payment_id))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Run pure logic
    payment, booking, room = await process_refund_logic(payment, current_user.id, data.approve)

    # Commit here
    objects = [payment]
    if booking:
        objects.append(booking)
    if room:
        objects.append(room)

    session.add_all(objects)
    await session.commit()
    await session.refresh(payment)

    return payment