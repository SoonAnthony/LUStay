import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.bookings.models import Booking, BookingStatus
from app.bookings.schema import BookingCreate, BookingUpdate
from app.rooms.models import Room, RoomType


async def create_booking_logic(session: AsyncSession, user_id: uuid.UUID, booking_data: BookingCreate) -> Booking:
    result = await session.exec(select(Room).where(Room.id == booking_data.room_id))
    room = result.first()
    if not room:
        raise ValueError("Room not found")

    result = await session.exec(select(RoomType).where(RoomType.id == room.room_type_id))
    room_type = result.first()
    if not room_type:
        raise ValueError("Room type not found")

    # Check capacity before allowing booking
    active_bookings_result = await session.exec(
        select(Booking).where(
            Booking.room_id == booking_data.room_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
        )
    )
    active_bookings = active_bookings_result.all()

    if booking_data.is_shared:
        # Shared room: count individual occupants against capacity
        if len(active_bookings) >= room_type.capacity:
            raise ValueError(f"Room is at full capacity ({room_type.capacity} occupants)")
    else:
        # Solo booking: any active booking means the room is taken
        if len(active_bookings) > 0:
            raise ValueError("Room is already booked")

    # Calculate total price based on solo vs shared
    if booking_data.is_shared:
        total_price = room_type.price_double // room_type.capacity
    else:
        total_price = room_type.price_single

    deposit_amount = int(total_price * 0.2)

    booking = Booking(
        user_id=user_id,
        room_id=booking_data.room_id,
        semester=booking_data.semester,
        is_shared=booking_data.is_shared,
        total_price=total_price,
        deposit_amount=deposit_amount,
        amount_paid=0,
        status=BookingStatus.PENDING,
    )
    return booking


async def update_booking_logic(session: AsyncSession, booking: Booking, update_data: BookingUpdate) -> Booking:
    if update_data.room_id is not None:
        booking.room_id = update_data.room_id
    if update_data.semester is not None:
        booking.semester = update_data.semester
    if update_data.status is not None:
        booking.status = update_data.status
    return booking


async def get_booking_logic(session: AsyncSession, booking_id: uuid.UUID) -> Booking:
    booking = await session.get(Booking, booking_id)
    if not booking:
        raise ValueError("Booking not found")
    return booking


async def list_bookings_logic(session: AsyncSession) -> list[Booking]:
    result = await session.exec(select(Booking))
    return result.all()


async def cancel_booking_logic(session: AsyncSession, booking: Booking) -> Booking:
    if booking.status == BookingStatus.CANCELLED:
        raise ValueError("Booking is already cancelled")
    booking.status = BookingStatus.CANCELLED
    return booking