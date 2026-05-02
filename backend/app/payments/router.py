import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Optional
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
from app.payments.models import Payment, PaymentStatus
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
    # ✅ FIX: Field is now reservation_id (matches schema rename)
    reservation = await session.get(Reservation, data.reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    payment, reservation = await initiate_payment_logic(reservation, data.phone_number)

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
    # ✅ FIX: Only parse raw body once for debugging — don't call payload.dict() twice
    data = await request.json()
    print("RAW MPESA CALLBACK:", data)

    stk_callback = payload.Body.stkCallback
    checkout_id = stk_callback.CheckoutRequestID

    payment = (
        await session.exec(
            select(Payment).where(Payment.checkout_request_id == checkout_id)
        )
    ).first()

    reservation = (
        await session.exec(
            select(Reservation).where(
                Reservation.mpesa_checkout_request_id == checkout_id
            )
        )
    ).first()

    if not payment:
        # Callback arrived for an unknown checkout — log and acknowledge
        print(f"WARNING: No payment found for checkout_id={checkout_id}")
        return {"status": "ok", "payment_id": None}

    payment, booking, updated_reservation = await handle_callback_logic(
        payload.dict(), payment, reservation, session
    )

    objects = [payment]

    if booking:
        session.add(booking)
        await session.commit()
        session.expire_all()
        await session.refresh(booking)

        payment.booking_id = booking.id
        objects.append(payment)

        room = await session.get(Room, booking.room_id)
        if room:
            await session.refresh(room)

    if updated_reservation:
        objects.append(updated_reservation)

    session.add_all(objects)
    await session.commit()
    session.expire_all()

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

    payment = await request_refund_logic(payment, current_user.id, data.reason)

    session.add(payment)
    await session.commit()
    await session.refresh(payment)

    return payment


@payments_router.get("/by-booking/{booking_id}", response_model=PaymentRead)
async def get_payment_by_booking(
    booking_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    payment = (
        await session.exec(
            select(Payment).where(Payment.booking_id == booking_id)
        )
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return payment


@payments_router.get("/", response_model=list[PaymentRead])
async def list_payments(
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
):
    query = select(Payment)

    if status:
        try:
            payment_status = PaymentStatus[status]  # matches "REFUND_REQUESTED" etc.
            query = query.where(Payment.status == payment_status)
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    payments = (await session.exec(query)).all()
    return payments


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

    # ✅ FIX: Pass session so process_refund_logic can fetch real DB rows
    payment, booking, room = await process_refund_logic(
        payment, current_user.id, data.approve, session
    )

    objects = [payment]
    if booking:
        objects.append(booking)
    if room:
        objects.append(room)

    session.add_all(objects)
    await session.commit()
    await session.refresh(payment)

    return payment