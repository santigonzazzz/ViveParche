"""
Rewards and Loyalty router for VibeMap AI.
Handles the Passport stamps and coupon claims.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.models.reward import RewardClaimRequest, RewardResponse, ExperienceStampResponse
from app.models.ticket import TicketValidationRequest
from app.services import reward_service
from app.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/rewards", tags=["Loyalty"])


@router.get("/passport")
async def get_passport(user=Depends(get_current_user)):
    """Retrieve summarized progress for the user's passport."""
    try:
        return await reward_service.get_passport_summary(user["id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stamps/count/{store_id}")
async def get_stamp_count(store_id: str, user=Depends(get_current_user)):
    """Get count of stamps for a specific store."""
    try:
        return await reward_service.get_stamp_count(user["id"], store_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/claim", response_model=RewardResponse)
async def claim_reward(req: RewardClaimRequest, user=Depends(get_current_user)):
    """Convert stamps into a claimable reward coupon."""
    try:
        return await reward_service.claim_reward(user["id"], req.store_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/validate")
async def validate_reward(req: TicketValidationRequest, user=Depends(get_current_user)):
    """Business validation of a reward coupon."""
    try:
        return await reward_service.validate_reward(user["id"], req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
