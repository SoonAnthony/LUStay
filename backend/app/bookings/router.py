import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.engine import get_session
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.bookings.models import Booking
from app.bookings.schema import BookingCreate, BookingRead, BookingUpdate
from app.bookings.service import (
    create_booking_logic,
    get_booking_logic,
    list_bookings_logic,
    update_booking_logic,
    cancel_booking_logic,
)
from app.user.models import User
from app.user.dependencies import (
    get_current_active_user,
    get_current_landlord_or_admin,
)
from app.payments.service import initiate_payment

bookings_router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])


@bookings_router.post("/", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        booking = await create_booking_logic(session, current_user.id, booking_data)
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        # Initiate payment after commit
        # booking_data should include phone_number
        await initiate_payment(session, booking.id, booking_data.phone_number)
        result = await session.execute(
            select(Booking)
            .options(selectinload(Booking.room), selectinload(Booking.user))
            .where(Booking.id == booking.id)
        )
        booking_loaded = result.scalar_one()
        return BookingRead.model_validate(booking_loaded)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking",
        )

    return BookingRead.model_validate(booking)


@bookings_router.get("/", response_model=list[BookingRead])
async def list_bookings(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    bookings = await list_bookings_logic(session)
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
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    booking = await update_booking_logic(session, booking, update_data)
    session.add(booking)
    await session.commit()
    await session.refresh(booking)
    return BookingRead.model_validate(booking)


@bookings_router.patch("/{booking_id}/cancel", response_model=BookingRead)
async def cancel_booking(
    booking_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    try:
        booking = await get_booking_logic(session, booking_id)
        booking = await cancel_booking_logic(session, booking)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cancellation failed: {str(e)}",
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    session.add(booking)
    await session.commit()
    await session.refresh(booking)

    # Placeholder for refund logic
    # e.g., await refund_service.initiate_refund(booking)

    return BookingRead.model_validate(booking)