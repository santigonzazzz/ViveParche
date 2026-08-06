"""
Discovery router for VibeMap AI.
Hybrid endpoints for exploring events and venues.
"""

from fastapi import APIRouter, HTTPException, Query, Header
from uuid import UUID
from typing import Dict, Any, Optional
from app.services import venue_service

router = APIRouter(prefix="/discovery", tags=["Discovery"])


@router.get("")
async def get_discovery(
    municipality_id: UUID = Query(..., description="The ID of the municipality to explore"),
    x_user_lat: Optional[float] = Header(None, alias="X-User-Lat"),
    x_user_lng: Optional[float] = Header(None, alias="X-User-Lng")
):
    """
    Hybrid Discovery Endpoint.
    Optional user coordinates in headers for local distance calculation.
    Returns:
    - Next 5 upcoming events (with distance if possible).
    - Top 5 rated venues (with distance if possible).
    """
    try:
        return await venue_service.get_discovery_data(municipality_id, x_user_lat, x_user_lng)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
