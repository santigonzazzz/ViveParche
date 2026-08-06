from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.services import team_service
from app.middleware.security import require_business, require_owner

router = APIRouter(prefix="/team", tags=["team"])

@router.post("/invite")
async def invite_worker(data: Dict[str, Any], user=Depends(require_owner)):
    """Invite a new worker to the venue team."""
    try:
        email = data.get("email")
        full_name = data.get("full_name")
        password = data.get("password")
        
        if not email or not full_name:
            raise HTTPException(status_code=400, detail="Email and full name are required")
            
        result = await team_service.invite_worker(user["id"], email, full_name, password)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/members")
async def get_team_members(user=Depends(require_owner)):
    """List all team members for the venue."""
    try:
        return await team_service.get_team_members(user["id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{member_id}")
async def remove_member(member_id: str, user=Depends(require_owner)):
    """Remove a member from the team."""
    try:
        await team_service.remove_team_member(user["id"], member_id)
        return {"message": "Member removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/members/{member_id}")
async def update_member(member_id: str, data: Dict[str, Any], user=Depends(require_owner)):
    """Update worker information."""
    try:
        result = await team_service.update_team_member(user["id"], member_id, data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
