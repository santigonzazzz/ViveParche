"""
Ticket and Reservation models for VibeMap AI.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class PromoCodeBase(BaseModel):
    code: str
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    expires_at: Optional[datetime] = None


class TicketReservationCreate(BaseModel):
    event_id: UUID
    quantity: int = Field(..., gt=0)
    promo_code: Optional[str] = None


class TicketReservationResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    quantity: int
    status: str
    expires_at: datetime
    promo_code_id: Optional[UUID] = None
    created_at: datetime


class TicketResponse(BaseModel):
    id: UUID
    reservation_id: UUID
    user_id: UUID
    event_id: UUID
    qr_code_token: str
    text_code: str
    attended: bool
    created_at: datetime


class TicketValidationRequest(BaseModel):
    qr_code_token: Optional[str] = None
    text_code: Optional[str] = None
