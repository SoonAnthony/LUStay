import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.bookings.models import Reservation, ReservationStatus, Booking, BookingStatus
from app.bookings.schema import BookingUpdate
from app.rooms.models import Room, RoomType, RoomStatus

# ✅ FIX: Configurable via env var; 300s (5 min) gives M-Pesa STK push enough time
RESERVATION_TTL_SECONDS = int(os.getenv("RESERVATION_TTL_SECONDS", 120))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_room_and_type(session: AsyncSession, room_id: uuid.UUID) -> tuple[Room, RoomType]:
    result = await session.exec(select(Room).where(Room.id == room_id))
    room = result.first()
    if not room:
        raise ValueError("Room not found")
    result = await session.exec(select(RoomType).where(RoomType.id == room.room_type_id))
    room_type = result.first()
    if not room_type:
        raise ValueError("Room type not found")
    return room, room_type


async def _expire_stale_reservations(session: AsyncSession, room_id: uuid.UUID) -> None:
    now = datetime.now(timezone.utc)
    result = await session.exec(
        select(Reservation).where(
            Reservation.room_id == room_id,
            Reservation.status == ReservationStatus.ACTIVE,
            Reservation.expires_at <= now,
        )
    )
    for r in result.all():
        r.status = ReservationStatus.EXPIRED
        session.add(r)  # ✅ FIX: was missing session.add — changes were never persisted


async def _count_active_slots(session: AsyncSession, room_id: uuid.UUID) -> int:
    now = datetime.now(timezone.utc)
    reservations = await session.exec(
        select(Reservation).where(
            Reservation.room_id == room_id,
            Reservation.status == ReservationStatus.ACTIVE,
            Reservation.expires_at > now,
        )
    )
    bookings = await session.exec(
        select(Booking).where(
            Booking.room_id == room_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.ACTIVE]),
        )
    )
    return len(reservations.all()) + len(bookings.all())


# ---------------------------------------------------------------------------
# Reservation
# ---------------------------------------------------------------------------

async def create_reservation_logic(
    session: AsyncSession,
    user_id: uuid.UUID,
    room_id: uuid.UUID,
    semester: str,
    is_shared: bool,
) -> Reservation:
    room, room_type = await _get_room_and_type(session, room_id)

    if room.status == RoomStatus.FULLY_OCCUPIED:
        raise ValueError("Room is fully occupied and cannot be booked.")

    if room.status == RoomStatus.MAINTENANCE:
        raise ValueError("Room is currently under maintenance and cannot be booked.")

    # Expire stale reservations first so their slots are freed before counting
    await _expire_stale_reservations(session, room_id)

    # Prevent duplicate active reservation from same user for this room
    existing = await session.exec(
        select(Reservation).where(
            Reservation.user_id == user_id,
            Reservation.room_id == room_id,
            Reservation.status == ReservationStatus.ACTIVE,
        )
    )
    if existing.first():
        raise ValueError("You already have an active reservation for this room.")

    # NOTE: There is still a TOCTOU race between _count_active_slots and
    # inserting the new Reservation. For production, add a DB-level advisory
    # lock or a unique partial index to prevent double-booking under concurrency.
    active_slots = await _count_active_slots(session, room_id)

    if active_slots >= room_type.capacity:
        raise ValueError("Room is fully reserved or occupied.")

    if not is_shared and active_slots >= 1:
        raise ValueError("Room already has occupants — single booking not available.")

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=RESERVATION_TTL_SECONDS)
    return Reservation(
        user_id=user_id,
        room_id=room_id,
        semester=semester,
        is_shared=is_shared,
        expires_at=expires_at,
        status=ReservationStatus.ACTIVE,
    )


async def attach_mpesa_checkout_id_logic(reservation: Reservation, checkout_request_id: str) -> Reservation:
    reservation.mpesa_checkout_request_id = checkout_request_id
    return reservation


async def convert_reservation_to_booking_logic(
    session: AsyncSession,
    reservation: Reservation,
    amount_paid: int,
) -> tuple[Booking, Reservation]:
    now = datetime.now(timezone.utc)

    # ✅ FIX: Raise instead of silently returning None so the caller always gets
    #         a clear failure signal. Also persist the EXPIRED status change.
    if reservation.status != ReservationStatus.ACTIVE or reservation.expires_at <= now:
        reservation.status = ReservationStatus.EXPIRED
        session.add(reservation)  # ✅ FIX: was missing — EXPIRED status was never saved
        raise ValueError("Reservation has expired or is no longer active.")

    room, room_type = await _get_room_and_type(session, reservation.room_id)

    # ✅ FIX: Use integer arithmetic (avoid float rounding for money).
    #         price_double is stored in smallest currency unit (e.g. cents/KES).
    if reservation.is_shared:
        total_price = room_type.price_double // room_type.capacity
    else:
        total_price = room_type.price_single

    # Deposit = 20% of total price, rounded down to nearest integer
    deposit_amount = (total_price * 20) // 100

    booking = Booking(
        user_id=reservation.user_id,
        room_id=reservation.room_id,
        semester=reservation.semester,
        is_shared=reservation.is_shared,
        total_price=total_price,
        deposit_amount=deposit_amount,
        amount_paid=amount_paid,
        status=BookingStatus.CONFIRMED,
        mpesa_checkout_request_id=reservation.mpesa_checkout_request_id,
    )
    reservation.status = ReservationStatus.CONVERTED
    session.add(reservation)  # ✅ FIX: persist the CONVERTED status

    existing_bookings = await session.exec(
        select(Booking).where(
            Booking.room_id == reservation.room_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.ACTIVE]),
        )
    )
    new_occupants = len(existing_bookings.all()) + 1  # +1 for the booking we're about to add

    room.occupants = new_occupants

    if not reservation.is_shared:
        # Single booking occupies the whole room regardless of capacity
        room.status = RoomStatus.FULLY_OCCUPIED
    elif new_occupants >= room_type.capacity:
        room.status = RoomStatus.FULLY_OCCUPIED
    elif new_occupants > 0:
        room.status = RoomStatus.PARTIALLY_OCCUPIED
    else:
        room.status = RoomStatus.AVAILABLE

    session.add(room)

    return booking, reservation


async def expire_reservation_logic(reservation: Reservation) -> Reservation:
    if reservation.status != ReservationStatus.ACTIVE:
        raise ValueError(f"Reservation is already {reservation.status}.")
    reservation.status = ReservationStatus.EXPIRED
    return reservation


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

async def get_booking_logic(session: AsyncSession, booking_id: uuid.UUID) -> Booking:
    booking = await session.get(Booking, booking_id)
    if not booking:
        raise ValueError("Booking not found")
    return booking


async def list_bookings_logic(
    session: AsyncSession,
    offset: int = 0,
    limit: int = 50,  # ✅ FIX: Added pagination — fetching all rows is a risk at scale
) -> list[Booking]:
    result = await session.exec(select(Booking).offset(offset).limit(limit))
    return result.all()


async def list_student_bookings_logic(session: AsyncSession, student_id: uuid.UUID) -> list[Booking]:
    result = await session.exec(
        select(Booking).where(Booking.user_id == student_id)
    )
    return result.all()


async def update_booking_logic(booking: Booking, update_data: BookingUpdate) -> Booking:
    # ⚠️  WARNING: changing room_id does NOT validate availability on the new room.
    #     Add room availability checks here before allowing room transfers.
    if update_data.room_id is not None:
        booking.room_id = update_data.room_id
    if update_data.semester is not None:
        booking.semester = update_data.semester
    if update_data.status is not None:
        booking.status = update_data.status
    return booking


async def record_balance_payment_logic(booking: Booking, amount: int) -> Booking:
    if booking.status == BookingStatus.CANCELLED:
        raise ValueError("Cannot pay for a cancelled booking.")
    if booking.status == BookingStatus.ACTIVE:
        raise ValueError("Booking is already fully paid.")

    # ✅ FIX: Guard against overpayment
    outstanding = booking.total_price - booking.amount_paid
    if amount > outstanding:
        raise ValueError(
            f"Payment of {amount} exceeds outstanding balance of {outstanding}."
        )

    booking.amount_paid += amount
    if booking.amount_paid >= booking.total_price:
        booking.status = BookingStatus.ACTIVE
    return booking


async def cancel_booking_logic(
    session: AsyncSession,  # ✅ FIX: session now required so we can update room state
    booking: Booking,
) -> Booking:
    if booking.status == BookingStatus.CANCELLED:
        raise ValueError("Booking is already cancelled.")

    booking.status = BookingStatus.CANCELLED

    # ✅ FIX: Update room occupancy when a booking is cancelled so the room
    #         doesn't remain appearing occupied after cancellation.
    room, room_type = await _get_room_and_type(session, booking.room_id)

    existing_bookings = await session.exec(
        select(Booking).where(
            Booking.room_id == booking.room_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.ACTIVE]),
        )
    )
    # Subtract 1 because this booking is being cancelled (but not yet committed)
    remaining_occupants = max(0, len(existing_bookings.all()) - 1)
    room.occupants = remaining_occupants

    if remaining_occupants == 0:
        room.status = RoomStatus.AVAILABLE
    elif remaining_occupants < room_type.capacity:
        room.status = RoomStatus.PARTIALLY_OCCUPIED
    else:
        room.status = RoomStatus.FULLY_OCCUPIED

    session.add(room)

    return booking