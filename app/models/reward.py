"""
Reward and Loyalty models for VibeMap AI.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class ExperienceStampResponse(BaseModel):
    id: UUID
    user_id: UUID
    store_id: UUID
    event_id: UUID
    created_at: datetime


class RewardResponse(BaseModel):
    id: UUID
    user_id: UUID
    store_id: UUID
    reward_type: str
    qr_code_token: str
    text_code: str
    claimed_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    created_at: datetime


class RewardClaimRequest(BaseModel):
    store_id: UUID
