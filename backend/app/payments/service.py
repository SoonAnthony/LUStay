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

async def handle_callback_logic(
    payload: dict,
    payment: Payment,
    reservation: Reservation | None,
    session: AsyncSession, 
) -> tuple[Payment, Booking | None, Reservation | None]:
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
            booking, updated_reservation = await convert_reservation_to_booking_logic(
                session, reservation, payment.amount
            )
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

# 3. Request Refund (Landlord) — pure logic
async def request_refund_logic(payment: Payment, user_id: uuid.UUID, reason: str) -> Payment:
    if not payment or payment.status != PaymentStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="Refund not allowed")

    payment.status = PaymentStatus.REFUND_REQUESTED
    payment.refund_requested_by = user_id
    payment.refund_reason = reason

    return payment


# 4. Process Refund (Admin) — pure logic
async def process_refund_logic(payment: Payment, admin_id: uuid.UUID, approve: bool) -> tuple[Payment, Booking | None, Room | None]:
    if not payment or payment.status != PaymentStatus.REFUND_REQUESTED:
        raise HTTPException(status_code=400, detail="Refund not allowed")

    booking = None
    room = None

    if not approve:
        payment.status = PaymentStatus.REFUND_REJECTED
    else:
        # Call Daraja Reversal API (sandbox simulation)
        await reverse_transaction(payment.transaction_ref, payment.amount, payment.phone_number)

        payment.status = PaymentStatus.REFUNDED
        payment.refund_approved_by = admin_id
        payment.refunded_at = datetime.utcnow()

        # Reverse booking effects
        booking = payment.booking_id and Booking(id=payment.booking_id, status=BookingStatus.CANCELLED)
        if booking:
            room = Room(id=booking.room_id)
            room.occupants = max(getattr(room, "occupants", 1) - 1, 0)

    return payment, booking, room
