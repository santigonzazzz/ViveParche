"""
Venue models for VibeMap AI.
Pydantic schemas for venue data validation.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class DayHours(BaseModel):
    """Schema for a single day's opening hours."""
    open: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$") # HH:MM format
    close: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    closed: Optional[bool] = False


class OpeningHours(BaseModel):
    """Schema for all days' opening hours."""
    monday: Optional[DayHours] = None
    tuesday: Optional[DayHours] = None
    wednesday: Optional[DayHours] = None
    thursday: Optional[DayHours] = None
    friday: Optional[DayHours] = None
    saturday: Optional[DayHours] = None
    sunday: Optional[DayHours] = None


class VenueBase(BaseModel):
    """Base venue schema with common fields."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    municipality_id: UUID
    address: Optional[str] = None
    vibe_tags: List[str] = []
    price_range: int = Field(default=1, ge=1, le=4)
    whatsapp_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opening_hours: Optional[Dict[str, DayHours]] = None
    image_url: Optional[str] = None
    menu_url: Optional[str] = None
    menu_text: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    website_url: Optional[str] = None
    gallery_images: Optional[List[str]] = []
    special_offers_pdf_url: Optional[str] = None
    special_offers_text: Optional[str] = None
    special_offers_json: Optional[List[Dict[str, Any]]] = []
    subscription_tier: str = "FREE"
    billing_status: str = "paid"

    @field_validator("description", mode="before", check_fields=False)
    @classmethod
    def sanitize_description(cls, v):
        if isinstance(v, str):
            import html
            return html.escape(v.strip())
        return v

    @field_validator("vibe_tags", mode="before", check_fields=False)
    @classmethod
    def sanitize_vibe_tags(cls, v):
        if isinstance(v, list):
            import html
            return [html.escape(str(tag).strip()) for tag in v]
        return v


class VenueCreate(VenueBase):
    """Schema for creating a new venue."""
    owner_id: UUID


class VenueUpdate(BaseModel):
    """Schema for updating a venue. All fields are optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    municipality_id: Optional[UUID] = None
    address: Optional[str] = None
    vibe_tags: Optional[List[str]] = None
    price_range: Optional[int] = Field(None, ge=1, le=4)
    whatsapp_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opening_hours: Optional[Dict[str, DayHours]] = None
    image_url: Optional[str] = None
    menu_url: Optional[str] = None
    menu_text: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    website_url: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    special_offers_pdf_url: Optional[str] = None
    special_offers_text: Optional[str] = None
    special_offers_json: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None

    @field_validator("description", mode="before", check_fields=False)
    @classmethod
    def sanitize_description(cls, v):
        if isinstance(v, str):
            import html
            return html.escape(v.strip())
        return v

    @field_validator("vibe_tags", mode="before", check_fields=False)
    @classmethod
    def sanitize_vibe_tags(cls, v):
        if isinstance(v, list):
            import html
            return [html.escape(str(tag).strip()) for tag in v]
        return v


class VenueItemBase(BaseModel):
    """Base schema for venue items (menu/services)."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: float = Field(..., ge=0)
    image_url: Optional[str] = None
    is_available: bool = True


class VenueItemCreate(VenueItemBase):
    """Schema for creating a venue item."""
    venue_id: UUID


class VenueItemUpdate(BaseModel):
    """Schema for updating a venue item."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    image_url: Optional[str] = None
    is_available: Optional[bool] = None


class VenueItemResponse(VenueItemBase):
    """Schema for venue item responses."""
    id: UUID
    venue_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class VenueResponse(VenueBase):
    """Schema for venue API responses."""
    id: UUID
    owner_id: UUID
    rating: float = 0.0
    is_open: bool = False
    status: str = "active"
    menu_text: Optional[str] = None
    subscription_tier: str = "FREE"
    billing_status: str = "paid"
    created_at: datetime
    completion_percentage: Optional[int] = None
    special_offers_pdf_url: Optional[str] = None
    special_offers_text: Optional[str] = None
    special_offers_json: Optional[List[Dict[str, Any]]] = []
    items: Optional[List[VenueItemResponse]] = []

    model_config = {"from_attributes": True}
