"""
Bookings router for VibeMap AI.
API endpoints for booking CRUD operations.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from app.models.booking import BookingCreate, BookingUpdate, BookingResponse
from app.services import supabase_service
from app.utils.qr_generator import generate_booking_token

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post(
    "/",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new booking",
)
async def create_booking(booking: BookingCreate):
    """Create a new booking with auto-generated QR code token."""
    try:
        # Generate unique QR code token
        qr_token = generate_booking_token(booking.event_id, booking.user_id)

        # Prepare booking data with QR token and default attended status
        booking_data = booking.model_dump()
        booking_data["qr_code_token"] = qr_token
        booking_data["attended"] = False

        created_booking = await supabase_service.create_booking(booking_data)
        return created_booking
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create booking: {str(e)}",
        )


@router.get(
    "/",
    response_model=List[BookingResponse],
    summary="Get all bookings",
)
async def get_bookings():
    """Retrieve all bookings from the database."""
    try:
        bookings = await supabase_service.get_bookings()
        return bookings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch bookings: {str(e)}",
        )


@router.get(
    "/user/{user_id}",
    response_model=List[BookingResponse],
    summary="Get bookings by user",
)
async def get_user_bookings(user_id: UUID):
    """Retrieve all bookings for a specific user."""
    try:
        bookings = await supabase_service.get_bookings_by_user(user_id)
        return bookings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user bookings: {str(e)}",
        )


@router.get(
    "/event/{event_id}",
    response_model=List[BookingResponse],
    summary="Get bookings by event",
)
async def get_event_bookings(event_id: UUID):
    """Retrieve all bookings for a specific event."""
    try:
        bookings = await supabase_service.get_bookings_by_event(event_id)
        return bookings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch event bookings: {str(e)}",
        )


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Get a specific booking",
)
async def get_booking(booking_id: UUID):
    """Retrieve a specific booking by ID."""
    try:
        booking = await supabase_service.get_booking_by_id(booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID {booking_id} not found",
            )
        return booking
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch booking: {str(e)}",
        )


@router.put(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Update a booking",
)
async def update_booking(booking_id: UUID, booking_update: BookingUpdate):
    """Update an existing booking (e.g., mark as attended)."""
    try:
        # First check if booking exists
        existing_booking = await supabase_service.get_booking_by_id(booking_id)
        if not existing_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID {booking_id} not found",
            )

        update_data = booking_update.model_dump(exclude_unset=True)
        updated_booking = await supabase_service.update_booking(booking_id, update_data)

        return updated_booking
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update booking: {str(e)}",
        )


@router.delete(
    "/{booking_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a booking",
)
async def delete_booking(booking_id: UUID):
    """Delete a booking from the database."""
    try:
        # First check if booking exists
        existing_booking = await supabase_service.get_booking_by_id(booking_id)
        if not existing_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID {booking_id} not found",
            )

        await supabase_service.delete_booking(booking_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete booking: {str(e)}",
        )
