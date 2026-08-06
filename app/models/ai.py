"""
AI chat models for VibeMap AI.
Pydantic schemas for AI interaction.
"""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Schema for AI chat requests."""

    event_id: Optional[UUID] = None
    user_question: str = Field(..., min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    """Schema for AI chat responses."""

    event_title: str
    answer: str

