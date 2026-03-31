import uuid
from sqlmodel import Session, select
from app.bookings.models import Booking, BookingStatus
from app.bookings.schema import BookingCreate, BookingRead, BookingUpdate
from app.rooms.models import Room, RoomType


def create_booking_logic(session: Session, user_id: uuid.UUID, booking_data: BookingCreate) -> Booking:
    room = session.exec(select(Room).where(Room.id == booking_data.room_id)).first()
    if not room:
        raise ValueError("Room not found")

    room_type = session.exec(select(RoomType).where(RoomType.id == room.room_type_id)).first()
    if not room_type:
        raise ValueError("Room type not found")

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


def update_booking_logic(session: Session, booking: Booking, update_data: BookingUpdate) -> Booking:
    if update_data.room_id is not None:
        booking.room_id = update_data.room_id
    if update_data.semester is not None:
        booking.semester = update_data.semester
    if update_data.status is not None:
        booking.status = update_data.status

    return booking


def get_booking_logic(session: Session, booking_id: uuid.UUID) -> Booking:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise ValueError("Booking not found")
    return booking


def list_bookings_logic(session: Session) -> list[Booking]:
    return session.exec(select(Booking)).all()

def cancel_booking_logic(session: Session, booking: Booking) -> Booking:
    if booking.status == BookingStatus.CANCELLED:
        raise ValueError("Booking is already cancelled")

    booking.status = BookingStatus.CANCELLED
    return booking
