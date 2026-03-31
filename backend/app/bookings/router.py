import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.db.engine import get_session

from app.bookings.schema import BookingCreate, BookingRead, BookingUpdate
from app.bookings.service import (
    create_booking_logic,
    get_booking_logic,
    list_bookings_logic,
    update_booking_logic,
    cancel_booking_logic,
)
from app.bookings.models import Booking
from app.user.models import User
from app.user.dependencies import (
    get_current_active_user,
    get_current_landlord_or_admin,
)

bookings_router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])


@bookings_router.post("/", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        booking = create_booking_logic(session, current_user.id, booking_data)
        session.add(booking)
        session.commit()
        session.refresh(booking)
        return BookingRead.model_validate(booking)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@bookings_router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        booking = get_booking_logic(session, booking_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    if current_user.role == "STUDENT" and booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking",
        )

    return BookingRead.model_validate(booking)


@bookings_router.get("/", response_model=list[BookingRead])
async def list_bookings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    bookings = list_bookings_logic(session)
    return [BookingRead.model_validate(b) for b in bookings]


@bookings_router.patch("/{booking_id}", response_model=BookingRead)
async def update_booking(
    booking_id: uuid.UUID,
    update_data: BookingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    try:
        booking = get_booking_logic(session, booking_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    booking = update_booking_logic(session, booking, update_data)
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return BookingRead.model_validate(booking)



@bookings_router.patch("/{booking_id}/cancel", response_model=BookingRead)
async def cancel_booking(
    booking_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_landlord_or_admin),
):
    try:
        # Fetch booking and apply cancellation logic
        booking = get_booking_logic(session, booking_id)
        booking = cancel_booking_logic(session, booking)
    except ValueError as e:
        # Example: "Booking is already cancelled"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cancellation failed: {str(e)}",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    session.add(booking)
    session.commit()
    session.refresh(booking)

    # Placeholder for refund logic
    # e.g., refund_service.initiate_refund(booking)

    return BookingRead.model_validate(booking)