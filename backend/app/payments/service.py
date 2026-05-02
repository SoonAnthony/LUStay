import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.bookings.models import Reservation, ReservationStatus, Booking, BookingStatus
from app.bookings.service import convert_reservation_to_booking_logic
from app.rooms.models import Room, RoomStatus
from app.payments.models import Payment, PaymentStatus
from app.payments.utils import stk_push, reverse_transaction


# 1. Initiate Payment
async def initiate_payment_logic(
    reservation: Reservation,
    phone_number: str,
) -> tuple[Payment, Reservation]:
    # Keeping amount=1 for sandbox — Daraja sandbox only accepts KES 1
    amount = 1

    payment = Payment(
        booking_id=None,
        amount=amount,
        phone_number=phone_number,
        status=PaymentStatus.PENDING,
    )

    response = await stk_push(phone_number, amount, str(reservation.id))
    checkout_id = response.get("CheckoutRequestID")

    payment.checkout_request_id = checkout_id
    reservation.mpesa_checkout_request_id = checkout_id

    return payment, reservation


# 2. Handle M-Pesa STK callback
async def handle_callback_logic(
    payload: dict,
    payment: Payment,
    reservation: Reservation | None,
    session: AsyncSession,
) -> tuple[Payment, Booking | None, Reservation | None]:
    body = payload.get("Body", {})
    stk_callback = body.get("stkCallback", {})

    result_code = stk_callback.get("ResultCode")

    # ✅ FIX: CallbackMetadata is absent on failed payments — use `or {}` so
    #         .get("Item", []) never raises AttributeError on None
    metadata = stk_callback.get("CallbackMetadata") or {}

    if result_code == 0:  # success
        payment.status = PaymentStatus.SUCCESS
        payment.transaction_ref = next(
            (
                item["Value"]
                for item in metadata.get("Item", [])
                if item["Name"] == "MpesaReceiptNumber"
            ),
            None,
        )

        if reservation:
            # convert_reservation_to_booking_logic raises ValueError if the
            # reservation expired before the M-Pesa callback arrived
            try:
                booking, updated_reservation = await convert_reservation_to_booking_logic(
                    session, reservation, payment.amount
                )
                payment.booking_id = booking.id
                return payment, booking, updated_reservation
            except ValueError:
                # Slot already released — record the payment but no booking created
                return payment, None, reservation

        return payment, None, None

    else:  # payment failed or cancelled by user
        payment.status = PaymentStatus.FAILED
        if reservation:
            reservation.status = ReservationStatus.EXPIRED
            return payment, None, reservation
        return payment, None, None


# 3. Request Refund (Landlord) — pure logic
async def request_refund_logic(
    payment: Payment,
    user_id: uuid.UUID,
    reason: Optional[str],  # ✅ FIX: Optional to match RefundRequestSchema
) -> Payment:
    if not payment or payment.status != PaymentStatus.SUCCESS:
        raise HTTPException(
            status_code=400,
            detail="Only successful payments can be refunded.",
        )

    payment.status = PaymentStatus.REFUND_REQUESTED
    payment.refund_requested_by = user_id
    payment.refund_reason = reason

    return payment


# 4. Process Refund (Admin) — pure logic
async def process_refund_logic(
    payment: Payment,
    admin_id: uuid.UUID,
    approve: bool,
    session: AsyncSession,
) -> tuple[Payment, Booking | None, Room | None]:
    if not payment or payment.status != PaymentStatus.REFUND_REQUESTED:
        raise HTTPException(
            status_code=400,
            detail="Payment is not in a refundable state.",
        )

    booking = None
    room = None

    if not approve:
        payment.status = PaymentStatus.REFUND_REJECTED
    else:
        try:
            await reverse_transaction(
                payment.transaction_ref,
                payment.amount,
                payment.phone_number,
            )
        except Exception as e:
            print(f"WARNING: Reversal failed (expected in sandbox): {e}")

        payment.status = PaymentStatus.REFUNDED
        payment.refund_approved_by = admin_id
        payment.refunded_at = datetime.now(timezone.utc)

        if payment.booking_id:
            booking = await session.get(Booking, payment.booking_id)
            if booking:
                booking.status = BookingStatus.CANCELLED

                room = await session.get(Room, booking.room_id)
                if room:
                    room.occupants = max(room.occupants - 1, 0)
                    room.status = (
                        RoomStatus.AVAILABLE
                        if room.occupants == 0
                        else RoomStatus.PARTIALLY_OCCUPIED
                    )

    return payment, booking, room