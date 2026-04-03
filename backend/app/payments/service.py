import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException

from app.bookings.models import Reservation, ReservationStatus, Booking, BookingStatus
from app.bookings.service import convert_reservation_to_booking_logic
from app.rooms.models import Room, RoomStatus
from app.payments.models import Payment, PaymentStatus
from app.payments.utils import stk_push, reverse_transaction


# 1. Initiate Payment
async def initiate_payment_logic(reservation: Reservation, phone_number: str) -> Payment:
    # Calculate deposit (20% of total price) or use a fixed test amount
    amount = 1  # int(room_type.price_single * 0.2)

    payment = Payment(
        booking_id=None,
        amount=amount,
        phone_number=phone_number,
        status=PaymentStatus.PENDING,
    )

    # Call Daraja STK Push
    response = await stk_push(phone_number, amount, str(reservation.id))
    checkout_id = response.get("CheckoutRequestID")

    # Attach checkout ID to both payment and reservation
    payment.checkout_request_id = checkout_id
    reservation.mpesa_checkout_request_id = checkout_id

    return payment, reservation


async def handle_callback_logic(payload: dict, payment: Payment, reservation: Reservation | None) -> tuple[Payment, Booking | None, Reservation | None]:
    body = payload.get("Body", {})
    stk_callback = body.get("stkCallback", {})

    result_code = stk_callback.get("ResultCode")
    metadata = stk_callback.get("CallbackMetadata", {})

    if result_code == 0:  # success
        payment.status = PaymentStatus.SUCCESS
        payment.transaction_ref = next(
            (item["Value"] for item in metadata.get("Item", []) if item["Name"] == "MpesaReceiptNumber"),
            None
        )

        if reservation:
            booking, updated_reservation = await convert_reservation_to_booking_logic(payment.session, reservation, payment.amount)
            if booking:
                payment.booking_id = booking.id
                return payment, booking, updated_reservation
            else:
                reservation.status = ReservationStatus.EXPIRED
                return payment, None, reservation
        return payment, None, None

    else:  # failure
        payment.status = PaymentStatus.FAILED
        if reservation:
            reservation.status = ReservationStatus.EXPIRED
            return payment, None, reservation
        return payment, None, None

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

    # Find reservation by CheckoutRequestID
    result = await session.exec(select(Reservation).where(Reservation.mpesa_checkout_request_id == checkout_id))
    reservation = result.first()

    if result_code == 0:  # Payment successful
        payment.status = PaymentStatus.SUCCESS
        payment.transaction_ref = next(
            (item["Value"] for item in metadata.get("Item", []) if item["Name"] == "MpesaReceiptNumber"),
            None
        )

        if reservation:
            booking, updated_reservation = await convert_reservation_to_booking_logic(session, reservation, payment.amount)
            if booking:
                payment.booking_id = booking.id
                session.add_all([payment, booking, updated_reservation])
            else:
                # Reservation expired before payment confirmation
                session.add(reservation)
        else:
            session.add(payment)

    else:
        # Payment failed
        payment.status = PaymentStatus.FAILED
        if reservation:
            reservation.status = ReservationStatus.EXPIRED
            session.add(reservation)
        session.add(payment)

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
        if booking:
            booking.status = BookingStatus.CANCELLED
            room = await session.get(Room, booking.room_id)
            if room:
                room.occupants = max(getattr(room, "occupants", 1) - 1, 0)
                session.add(room)

    session.add(payment)
    await session.commit()
    await session.refresh(payment)
    return payment