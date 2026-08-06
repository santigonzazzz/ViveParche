"""
Municipalities router for VibeMap AI.
API endpoints for municipality CRUD operations.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from app.models.municipality import (
    MunicipalityCreate,
    MunicipalityUpdate,
    MunicipalityResponse,
)
from app.services import supabase_service

router = APIRouter(prefix="/municipalities", tags=["Municipalities"])


@router.post(
    "/",
    response_model=MunicipalityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new municipality",
)
async def create_municipality(municipality: MunicipalityCreate):
    """Create a new municipality in the database."""
    try:
        municipality_data = municipality.model_dump()
        created_municipality = await supabase_service.create_municipality(
            municipality_data
        )
        return created_municipality
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create municipality: {str(e)}",
        )


@router.get(
    "/",
    response_model=List[MunicipalityResponse],
    summary="Get all municipalities",
)
async def get_municipalities():
    """Retrieve all municipalities from the database."""
    try:
        municipalities = await supabase_service.get_municipalities()
        return municipalities
    except Exception as e:
        print(f"ERROR - get_municipalities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los municipios. Intenta de nuevo."
        )


@router.get(
    "/slug/{slug}",
    response_model=MunicipalityResponse,
    summary="Get municipality by slug",
)
async def get_municipality_by_slug(slug: str):
    """Retrieve a municipality by its slug (e.g., 'itagui-antioquia')."""
    try:
        municipality = await supabase_service.get_municipality_by_slug(slug)
        if not municipality:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Municipality with slug '{slug}' not found",
            )
        return municipality
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch municipality: {str(e)}",
        )


@router.get(
    "/{municipality_id}",
    response_model=MunicipalityResponse,
    summary="Get a specific municipality",
)
async def get_municipality(municipality_id: UUID):
    """Retrieve a specific municipality by ID."""
    try:
        municipality = await supabase_service.get_municipality_by_id(municipality_id)
        if not municipality:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Municipality with ID {municipality_id} not found",
            )
        return municipality
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch municipality: {str(e)}",
        )
