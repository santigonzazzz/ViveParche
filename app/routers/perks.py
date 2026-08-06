"""
Perks & Coupons Router.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from uuid import UUID
from app.services import perk_service, ai_marketing_service
from app.dependencies import get_current_user
from app.middleware.security import require_business, require_owner

router = APIRouter(prefix="/perks", tags=["Perks & Coupons"])

class PerkCreate(BaseModel):
    event_id: str
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    type: str = "discount"  # discount, freebie, access, custom
    conditions: str = ""
    active: bool = True

class PerkUpdate(BaseModel):
    title: str = None
    description: str = None
    type: str = None
    conditions: str = None
    active: bool = None

@router.get("/active")
async def get_active_perks(user=Depends(require_business)):
    """Get active perks across all events (Business staff access)."""
    try:
        owner_id = user.get("context_owner_id", user["id"])
        return await perk_service.get_active_perks_for_owner(owner_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/event/{event_id}")
async def get_event_perks(event_id: str):
    """Get all perks for an event (Public access)."""
    try:
        # Public users should only see active perks
        perks = await perk_service.get_event_perks(event_id, active_only=True)
        return perks
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/")
async def create_perk(perk: PerkCreate, user=Depends(require_owner)):
    """Create a new perk (Owner only)."""
    try:
        # TODO: Verify event ownership
        print(f"DEBUG: Creating perk with data: {perk.dict()}")
        return await perk_service.create_perk(perk.dict())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR creating perk: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error creating perk: {str(e)}")

@router.put("/{perk_id}")
async def update_perk(perk_id: str, updates: PerkUpdate, user=Depends(require_owner)):
    """Update a perk (Owner only)."""
    try:
        data = {k: v for k, v in updates.dict().items() if v is not None}
        if not data:
            return {"message": "No updates provided"}
        
        result = await perk_service.update_perk(perk_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Perk not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{perk_id}")
async def delete_perk(perk_id: str, user=Depends(require_owner)):
    """Delete a perk (Owner only)."""
    try:
        await perk_service.delete_perk(perk_id)
        return {"message": "Perk deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate-suggestions")
async def generate_perk_suggestions(
    data: Dict[str, Any], 
    user=Depends(require_business)
):
    """Generate AI perk suggestions."""
    try:
        event_details = data.get("event_details", {})
        suggestions = await ai_marketing_service.generate_perk_suggestions(event_details)
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
