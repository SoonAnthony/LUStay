import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.bookings.models import Reservation, ReservationStatus, Booking, BookingStatus
from app.bookings.schema import BookingUpdate
from app.rooms.models import Room, RoomType, RoomStatus

RESERVATION_TTL_SECONDS = 180  # 3 minutes

# Helpers
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
        session.add(r)

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
            Booking.status == BookingStatus.CONFIRMED,
        )
    )
    return len(reservations.all()) + len(bookings.all())

# Reservation
async def create_reservation_logic(session: AsyncSession, user_id: uuid.UUID, room_id: uuid.UUID, semester: str, is_shared: bool) -> Reservation:
    room, room_type = await _get_room_and_type(session, room_id)
    await _expire_stale_reservations(session, room_id)
    existing = await session.exec(
        select(Reservation).where(
            Reservation.user_id == user_id,
            Reservation.room_id == room_id,
            Reservation.status == ReservationStatus.ACTIVE,
        )
    )
    if existing.first():
        raise ValueError("You already have an active reservation for this room.")
    active_slots = await _count_active_slots(session, room_id)
    capacity = room_type.capacity if is_shared else 1
    if active_slots >= capacity:
        raise ValueError("Room is fully reserved or occupied.")
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

async def convert_reservation_to_booking_logic(session: AsyncSession, reservation: Reservation, amount_paid: int) -> tuple[Booking, Reservation]:
    now = datetime.now(timezone.utc)
    if reservation.status != ReservationStatus.ACTIVE or reservation.expires_at <= now:
        reservation.status = ReservationStatus.EXPIRED
        return None, reservation

    room, room_type = await _get_room_and_type(session, reservation.room_id)
    total_price = (room_type.price_double // room_type.capacity) if reservation.is_shared else room_type.price_single
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
        mpesa_checkout_request_id=reservation.mpesa_checkout_request_id
    )
    reservation.status = ReservationStatus.CONVERTED

    # Count current confirmed bookings (+1 for the one being created now)
    active_slots = await _count_active_slots(session, reservation.room_id)
    new_occupants = active_slots + 1

    # ✅ Update occupants count
    room.occupants = new_occupants

    # ✅ Set correct status — handles both shared and single rooms
    if new_occupants >= room_type.capacity:
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

# Booking
async def get_booking_logic(session: AsyncSession, booking_id: uuid.UUID) -> Booking:
    booking = await session.get(Booking, booking_id)
    if not booking:
        raise ValueError("Booking not found")
    return booking

async def list_bookings_logic(session: AsyncSession) -> list[Booking]:
    result = await session.exec(select(Booking))
    return result.all()

async def list_student_bookings_logic(session: AsyncSession, student_id: uuid.UUID) -> list[Booking]:
    result = await session.exec(
        select(Booking).where(Booking.user_id == student_id)
    )
    return result.all()

async def update_booking_logic(booking: Booking, update_data: BookingUpdate) -> Booking:
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
    booking.amount_paid += amount
    if booking.amount_paid >= booking.total_price:
        booking.status = BookingStatus.ACTIVE
    return booking

async def cancel_booking_logic(booking: Booking) -> Booking:
    if booking.status == BookingStatus.CANCELLED:
        raise ValueError("Booking is already cancelled.")
    booking.status = BookingStatus.CANCELLED
    return booking