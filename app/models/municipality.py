"""
Municipality models for VibeMap AI.
Pydantic schemas for municipality data validation.
"""

from uuid import UUID
from pydantic import BaseModel, Field


class MunicipalityBase(BaseModel):
    """Base municipality schema with common fields."""

    name: str = Field(..., min_length=1, max_length=200)
    department: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)


class MunicipalityCreate(MunicipalityBase):
    """Schema for creating a new municipality."""

    pass


class MunicipalityUpdate(BaseModel):
    """Schema for updating a municipality. All fields are optional."""

    name: str | None = Field(None, min_length=1, max_length=200)
    department: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)


class MunicipalityResponse(MunicipalityBase):
    """Schema for municipality API responses."""

    id: UUID

    model_config = {"from_attributes": True}
