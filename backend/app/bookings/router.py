import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone

from app.db.engine import get_session
from app.bookings.models import Booking, Reservation, ReservationStatus
from app.bookings.schema import BookingRead, BookingUpdate, ReservationCreate, ReservationRead
from app.bookings.service import (
    create_reservation_logic,
    get_booking_logic,
    update_booking_logic,
    record_balance_payment_logic,
    cancel_booking_logic,
    list_student_bookings_logic
)
from app.rooms.models import Room
from app.hostels.models import Hostel
from app.user.models import User
from app.user.dependencies import get_current_active_user, get_current_landlord_or_admin
from app.payments.service import initiate_payment_logic


bookings_router = APIRouter(prefix="/bookings", tags=["Bookings"])


@bookings_router.post("/reservations", response_model=ReservationRead, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    request: ReservationCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a reservation and initiate M-Pesa payment."""
    try:
        reservation = await create_reservation_logic(
            session,
            current_user.id,
            request.room_id,
            request.semester,
            request.is_shared,
        )
        session.add(reservation)
        await session.commit()
        await session.refresh(reservation)

        payment, reservation = await initiate_payment_logic(reservation, request.phone_number)

        session.add_all([payment, reservation])
        await session.commit()
        await session.refresh(reservation)

        return ReservationRead.model_validate(reservation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@bookings_router.get("/reservations/{reservation_id}", response_model=ReservationRead)
async def get_reservation(
    reservation_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    reservation = await session.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ✅ Also expire it server-side if the TTL has passed, so the
    # frontend poll always gets the correct status back.
    if (
        reservation.status == ReservationStatus.ACTIVE
        and reservation.expires_at <= datetime.now(timezone.utc)
    ):
        reservation.status = ReservationStatus.EXPIRED
        session.add(reservation)
        await session.commit()
        await session.refresh(reservation)

    return ReservationRead.model_validate(reservation)


# ✅ NEW — called by the frontend the moment the countdown hits zero.
# Immediately marks the reservation EXPIRED so the slot is released
# and the UI can transition without waiting for the next poll.
@bookings_router.patch(
    "/reservations/{reservation_id}/expire",
    response_model=ReservationRead,
)
async def expire_reservation(
    reservation_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Expire a reservation immediately (called when the countdown reaches zero)."""
    reservation = await session.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Idempotent — already expired or converted is fine, just return it
    if reservation.status != ReservationStatus.ACTIVE:
        return ReservationRead.model_validate(reservation)

    reservation.status = ReservationStatus.EXPIRED
    session.add(reservation)
    await session.commit()
    await session.refresh(reservation)

    return ReservationRead.model_validate(reservation)


@bookings_router.get("/my", response_model=list[BookingRead])
async def list_my_bookings(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint",
        )
    bookings = await list_student_bookings_logic(session, current_user.id)
    return [BookingRead.model_validate(b) for b in bookings]


@bookings_router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        booking = await get_booking_logic(session, booking_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    if current_user.role == "STUDENT" and booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return BookingRead.model_validate(booking)


@bookings_router.get("/", response_model=list[BookingRead])
async def list_bookings(
    hostel_id: uuid.UUID | None = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    query = (
        select(Booking)
        .options(
            joinedload(Booking.room).joinedload(Room.hostel),
            joinedload(Booking.user),
        )
    )

    if current_user.role == "LANDLORD":
        query = query.join(Room, Booking.room_id == Room.id).join(Hostel, Room.hostel_id == Hostel.id)
        query = query.where(Hostel.owner_id == current_user.id)
        if hostel_id:
            query = query.where(Hostel.id == hostel_id)
    elif current_user.role == "ADMIN":
        if hostel_id:
            query = query.join(Room, Booking.room_id == Room.id).where(Room.hostel_id == hostel_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to list bookings")

    result = await session.execute(query)
    bookings = result.scalars().all()
    return [BookingRead.model_validate(b) for b in bookings]


@bookings_router.patch("/{booking_id}", response_model=BookingRead)
async def update_booking(
    booking_id: uuid.UUID,
    update_data: BookingUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    try:
        booking = await get_booking_logic(session, booking_id)
        booking = await update_booking_logic(booking, update_data)
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        return BookingRead.model_validate(booking)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@bookings_router.patch("/{booking_id}/balance", response_model=BookingRead)
async def record_balance_payment(
    booking_id: uuid.UUID,
    amount: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        booking = await get_booking_logic(session, booking_id)
        booking = await record_balance_payment_logic(booking, amount)
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        return BookingRead.model_validate(booking)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@bookings_router.patch("/{booking_id}/cancel", response_model=BookingRead)
async def cancel_booking(
    booking_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    try:
        booking = await get_booking_logic(session, booking_id)
        booking = await cancel_booking_logic(session, booking) 
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        return BookingRead.model_validate(booking)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cancellation failed: {str(e)}")
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")