"""
Event models for VibeMap AI.
Pydantic schemas for event data validation.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class EventBase(BaseModel):
    """Base event schema with common fields."""

    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    municipality_id: UUID
    vibe_tags: Optional[List[str]] = []
    event_date: Optional[datetime] = None
    location_address: Optional[str] = None
    price: float = Field(default=0, ge=0)
    image_url: Optional[str] = None
    venue_id: Optional[UUID] = None
    ticket_contact_type: Optional[str] = None  # 'whatsapp' | 'url'
    ticket_contact_value: Optional[str] = None  # phone or URL


class EventCreate(EventBase):
    """Schema for creating a new event."""

    owner_id: UUID

    @field_validator('event_date')
    @classmethod
    def validate_future_date(cls, v):
        """Ensure event date is in the future."""
        if v:
            # Ensure v is timezone-aware for comparison
            if v.tzinfo is None:
                from datetime import timezone
                v = v.replace(tzinfo=timezone.utc)
            
            from datetime import timezone
            if v < datetime.now(timezone.utc):
                raise ValueError('Event date must be in the future. Business owners cannot create events with past dates.')
        return v


class EventUpdate(BaseModel):
    """Schema for updating an event. All fields are optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    municipality_id: Optional[UUID] = None
    vibe_tags: Optional[List[str]] = None
    event_date: Optional[datetime] = None
    location_address: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    image_url: Optional[str] = None
    venue_id: Optional[UUID] = None
    ticket_contact_type: Optional[str] = None
    ticket_contact_value: Optional[str] = None
    manual_tickets_sold: Optional[int] = None
    view_count: Optional[int] = None


class EventResponse(EventBase):
    """Schema for event API responses."""

    id: UUID
    owner_id: UUID
    created_at: datetime
    tickets_sold: Optional[int] = 0
    manual_tickets_sold: Optional[int] = 0
    total_tickets: Optional[int] = 100
    view_count: Optional[int] = 0

    model_config = {"from_attributes": True}
