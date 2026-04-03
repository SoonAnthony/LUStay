import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.bookings.models import Reservation, ReservationStatus
from app.bookings.models import Booking, BookingStatus
from app.rooms.models import Room, RoomType

# How long a reservation holds a slot while awaiting M-Pesa callback
RESERVATION_TTL_SECONDS = 180  # 3 minutes


async def _get_room_and_type(
    session: AsyncSession, room_id: uuid.UUID
) -> tuple[Room, RoomType]:
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
    """Mark any expired ACTIVE reservations as EXPIRED so slots are released."""
    now = datetime.now(timezone.utc)
    result = await session.exec(
        select(Reservation).where(
            Reservation.room_id == room_id,
            Reservation.status == ReservationStatus.ACTIVE,
            Reservation.expires_at <= now,
        )
    )
    stale = result.all()
    for r in stale:
        r.status = ReservationStatus.EXPIRED
        session.add(r)


async def _count_active_slots(session: AsyncSession, room_id: uuid.UUID) -> int:
    """
    Count slots currently occupied by:
      - ACTIVE reservations (within TTL)
      - CONFIRMED bookings
    PENDING bookings no longer exist in this flow.
    """
    now = datetime.now(timezone.utc)

    active_reservations_result = await session.exec(
        select(Reservation).where(
            Reservation.room_id == room_id,
            Reservation.status == ReservationStatus.ACTIVE,
            Reservation.expires_at > now,
        )
    )
    reservation_count = len(active_reservations_result.all())

    confirmed_bookings_result = await session.exec(
        select(Booking).where(
            Booking.room_id == room_id,
            Booking.status == BookingStatus.CONFIRMED,
        )
    )
    booking_count = len(confirmed_bookings_result.all())

    return reservation_count + booking_count


async def create_reservation(
    session: AsyncSession,
    user_id: uuid.UUID,
    room_id: uuid.UUID,
    semester: str,
    is_shared: bool,
) -> Reservation:
    """
    Reserve a slot for up to RESERVATION_TTL_SECONDS.
    Raises ValueError if room is at capacity or student already has
    an active reservation for this room.
    Call this BEFORE initiating the M-Pesa STK push.
    """
    room, room_type = await _get_room_and_type(session, room_id)

    # Clean up expired reservations first so slots are accurate
    await _expire_stale_reservations(session, room_id)

    # Prevent a student from holding multiple slots on the same room
    existing_result = await session.exec(
        select(Reservation).where(
            Reservation.user_id == user_id,
            Reservation.room_id == room_id,
            Reservation.status == ReservationStatus.ACTIVE,
        )
    )
    if existing_result.first():
        raise ValueError(
            "You already have an active reservation for this room. "
            "Complete or cancel it before reserving again."
        )

    active_slots = await _count_active_slots(session, room_id)
    capacity = room_type.capacity if is_shared else 1

    if active_slots >= capacity:
        raise ValueError(
            f"Room is fully reserved or occupied "
            f"({'shared capacity: ' + str(room_type.capacity) if is_shared else 'solo room taken'})."
        )

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=RESERVATION_TTL_SECONDS)

    reservation = Reservation(
        user_id=user_id,
        room_id=room_id,
        semester=semester,
        is_shared=is_shared,
        expires_at=expires_at,
        status=ReservationStatus.ACTIVE,
    )
    session.add(reservation)
    await session.commit()
    await session.refresh(reservation)
    return reservation


async def attach_mpesa_checkout_id(
    session: AsyncSession,
    reservation: Reservation,
    checkout_request_id: str,
) -> Reservation:
    """
    After the STK push succeeds, store M-Pesa's CheckoutRequestID
    so the callback handler can look up the reservation.
    """
    reservation.mpesa_checkout_request_id = checkout_request_id
    session.add(reservation)
    await session.commit()
    await session.refresh(reservation)
    return reservation


async def convert_reservation_to_booking(
    session: AsyncSession,
    reservation: Reservation,
    amount_paid: int,
) -> Booking:
    """
    Called by the M-Pesa callback handler on successful payment.
    Creates the real Booking and marks the reservation as CONVERTED.
    Raises ValueError if the reservation has expired.
    """
    now = datetime.now(timezone.utc)

    if reservation.status != ReservationStatus.ACTIVE:
        raise ValueError(
            f"Reservation is no longer active (status: {reservation.status}). "
            "Student must start a new reservation."
        )

    if reservation.expires_at <= now:
        reservation.status = ReservationStatus.EXPIRED
        session.add(reservation)
        await session.commit()
        raise ValueError(
            "Reservation expired before payment was confirmed. "
            "Please try booking again."
        )

    room, room_type = await _get_room_and_type(session, reservation.room_id)

    total_price = (
        room_type.price_double // room_type.capacity
        if reservation.is_shared
        else room_type.price_single
    )
    deposit_amount = int(total_price * 0.2)

    booking = Booking(
        user_id=reservation.user_id,
        room_id=reservation.room_id,
        semester=reservation.semester,
        is_shared=reservation.is_shared,
        total_price=total_price,
        deposit_amount=deposit_amount,
        amount_paid=amount_paid,
        status=BookingStatus.CONFIRMED,
    )
    session.add(booking)

    reservation.status = ReservationStatus.CONVERTED
    session.add(reservation)

    await session.commit()
    await session.refresh(booking)
    return booking


async def expire_reservation(
    session: AsyncSession, reservation: Reservation
) -> Reservation:
    """Manually expire a reservation (e.g. student cancels or payment fails)."""
    if reservation.status != ReservationStatus.ACTIVE:
        raise ValueError(f"Reservation is already {reservation.status}.")
    reservation.status = ReservationStatus.EXPIRED
    session.add(reservation)
    await session.commit()
    await session.refresh(reservation)
    return reservation