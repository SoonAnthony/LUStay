import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException

from app.bookings.models import Booking, BookingStatus
from app.rooms.models import Room
from app.payments.models import Payment, PaymentStatus
from app.payments.utils import stk_push, reverse_transaction


# 1. Initiate Payment
async def initiate_payment(session: AsyncSession, booking_id: uuid.UUID, phone_number: str) -> Payment:
    booking = await session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Calculate deposit (20% of total price)
    amount = 1 #int(booking.total_price * 0.2)

    payment = Payment(
        booking_id=booking_id,
        amount=amount,
        phone_number=phone_number,
        status=PaymentStatus.PENDING,
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)

    # Call Daraja STK Push
    response = await stk_push(phone_number, amount, str(booking_id))
    payment.checkout_request_id = response.get("CheckoutRequestID")

    await session.commit()
    await session.refresh(payment)
    return payment


# 2. Handle Callback
async def handle_callback(session: AsyncSession, payload: dict) -> Payment:
    body = payload.get("Body", {})
    stk_callback = body.get("stkCallback", {})

    checkout_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")
    metadata = stk_callback.get("CallbackMetadata", {})

    # Find the payment by CheckoutRequestID
    result = await session.exec(select(Payment).where(Payment.checkout_request_id == checkout_id))
    payment = result.first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if result_code == 0:
        # Payment successful
        payment.status = PaymentStatus.SUCCESS
        payment.transaction_ref = next(
            (item["Value"] for item in metadata.get("Item", []) if item["Name"] == "MpesaReceiptNumber"),
            None
        )

        # Update booking and room
        booking = await session.get(Booking, payment.booking_id)
        if booking:
            booking.status = BookingStatus.CONFIRMED
            room = await session.get(Room, booking.room_id)
            if room:
                room.occupants = getattr(room, "occupants", 0) + 1

        session.add(payment)
        session.add(booking)
        if room:
            session.add(room)

    else:
        # Payment failed
        payment.status = PaymentStatus.FAILED

    await session.commit()
    await session.refresh(payment)
    return payment

# 3. Request Refund (Landlord)
async def request_refund(session: AsyncSession, payment_id: uuid.UUID, user_id: uuid.UUID, reason: str) -> Payment:
    payment = await session.get(Payment, payment_id)
    if not payment or payment.status != PaymentStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="Refund not allowed")

    payment.status = PaymentStatus.REFUND_REQUESTED
    payment.refund_requested_by = user_id
    payment.refund_reason = reason

    await session.commit()
    await session.refresh(payment)
    return payment


# 4. Process Refund (Admin)
async def process_refund(session: AsyncSession, payment_id: uuid.UUID, admin_id: uuid.UUID, approve: bool) -> Payment:
    payment = await session.get(Payment, payment_id)
    if not payment or payment.status != PaymentStatus.REFUND_REQUESTED:
        raise HTTPException(status_code=400, detail="Refund not allowed")

    if not approve:
        payment.status = PaymentStatus.REFUND_REJECTED
    else:
        # Call Daraja Reversal API (sandbox simulation)
        response = await reverse_transaction(payment.transaction_ref, payment.amount, payment.phone_number)

        payment.status = PaymentStatus.REFUNDED
        payment.refund_approved_by = admin_id
        payment.refunded_at = datetime.utcnow()

        # Reverse booking effects
        booking = await session.get(Booking, payment.booking_id)
        booking.status = BookingStatus.CANCELLED
        room = await session.get(Room, booking.room_id)
        room.occupants = max(getattr(room, "occupants", 1) - 1, 0)

    await session.commit()
    await session.refresh(payment)
    return payment