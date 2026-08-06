"""
Booking models for VibeMap AI.
Pydantic schemas for booking data validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class BookingBase(BaseModel):
    """Base booking schema with common fields."""

    event_id: UUID
    user_id: UUID


class BookingCreate(BookingBase):
    """Schema for creating a new booking."""

    pass


class BookingUpdate(BaseModel):
    """Schema for updating a booking. All fields are optional."""

    attended: Optional[bool] = None


class BookingResponse(BookingBase):
    """Schema for booking API responses."""

    id: UUID
    qr_code_token: str
    attended: bool
    created_at: datetime

    model_config = {"from_attributes": True}

