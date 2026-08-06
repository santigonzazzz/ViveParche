"""
Ticketing router for VibeMap AI.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.models.ticket import TicketReservationCreate, TicketReservationResponse, TicketValidationRequest, TicketResponse
from app.services import ticket_service
from app.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/tickets", tags=["Ticketing"])


@router.post("/reserve", response_model=TicketReservationResponse)
async def reserve_tickets(req: TicketReservationCreate, user=Depends(get_current_user)):
    """Temporarily lock tickets for 15 minutes."""
    try:
        return await ticket_service.reserve_tickets(user["id"], req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/purchase/{reservation_id}", response_model=List[TicketResponse])
async def purchase_tickets(reservation_id: str, user=Depends(get_current_user)):
    """Confirm payment and generate final tickets."""
    try:
        return await ticket_service.purchase_tickets(user["id"], reservation_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/validate")
async def validate_ticket(req: TicketValidationRequest, user=Depends(get_current_user)):
    """Business scan QR or enter code to validate attendance."""
    try:
        return await ticket_service.validate_ticket(user["id"], req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-tickets")
async def get_my_tickets(user=Depends(get_current_user)):
    """Retrieve all tickets owned by the user, grouped by event."""
    try:
        return await ticket_service.get_tickets_grouped_by_event(user["id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/reservation/{reservation_id}", response_model=TicketReservationResponse)
async def get_reservation(reservation_id: str, user=Depends(get_current_user)):
    """Fetch reservation details."""
    try:
        res = await ticket_service.get_reservation(reservation_id)
        # Security check: Ensure reservation belongs to the user
        if str(res["user_id"]) != str(user["id"]):
            raise Exception("Unauthorized access to reservation")
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/event/{event_id}/attendees")
async def get_event_attendees(event_id: str, user=Depends(get_current_user)):
    """Business/Staff view of all attendees for an event."""
    try:
        return await ticket_service.get_event_attendees(user["id"], event_id)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/event/{event_id}/stats")
async def get_event_ticketing_stats(event_id: str, user=Depends(get_current_user)):
    """Business/Staff view of ticketing metrics."""
    try:
        return await ticket_service.get_event_ticketing_stats(user["id"], event_id)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))
