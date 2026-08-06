"""
Team and Staff management models for VibeMap AI.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class TeamMemberResponse(BaseModel):
    id: UUID
    store_id: UUID
    user_id: UUID
    role: str
    accepted: bool
    created_at: datetime


class TeamInvitationCreate(BaseModel):
    email: str  # Email of the person to invite
    role: str = Field(..., pattern="^(owner|manager|staff|employer)$")


class TeamJoinRequest(BaseModel):
    invitation_code: str
