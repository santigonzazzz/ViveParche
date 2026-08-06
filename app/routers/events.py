"""
Events router for VibeMap AI.
API endpoints for event CRUD operations.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.models.event import EventCreate, EventUpdate, EventResponse
from app.services import supabase_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/events", tags=["Events"])


@router.post(
    "/",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event",
)
async def create_event(event: EventCreate):
    """Create a new event in the database."""
    try:
        event_data = event.model_dump()
        created_event = await supabase_service.create_event(event_data)
        return created_event
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create event: {str(e)}",
        )


@router.get(
    "/",
    response_model=List[EventResponse],
    summary="Get all events",
)
async def get_events():
    """Retrieve all events from the database."""
    try:
        events = await supabase_service.get_events()
        return events
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events: {str(e)}",
        )


@router.get(
    "/municipality/{municipality_id}",
    response_model=List[EventResponse],
    summary="Get events by municipality",
)
async def get_events_by_municipality(municipality_id: UUID):
    """Retrieve all events for a specific municipality."""
    try:
        events = await supabase_service.get_events_by_municipality(municipality_id)
        return events
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events by municipality: {str(e)}",
        )


@router.get(
    "/vibe/{vibe_tags}",
    response_model=List[EventResponse],
    summary="Get events by vibe tags",
)
async def get_events_by_vibe(vibe_tags: str):
    """
    Retrieve events matching vibe tags.
    Provide comma-separated tags, e.g., 'chill,romantic'
    """
    try:
        tag_list = [tag.strip() for tag in vibe_tags.split(",")]
        events = await supabase_service.get_events_by_vibe_tags(tag_list)
        return events
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events by vibe tags: {str(e)}",
        )


@router.get(
    "/search",
    response_model=List[EventResponse],
    summary="Search events",
)
async def get_events_by_search(query: str):
    """Search for events by title or description."""
    try:
        events = await supabase_service.search_events(query)
        return events
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search events: {str(e)}",
        )


@router.get(
    "/{event_id}",
    response_model=EventResponse,
    summary="Get a specific event",
)
async def get_event(event_id: str):
    """Retrieve a specific event by ID or Slug."""
    try:
        event = await supabase_service.get_event_by_id(event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found",
            )
        return event
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch event: {str(e)}",
        )


@router.patch(
    "/{event_id}",
    response_model=EventResponse,
    summary="Update an event",
)
@router.put(
    "/{event_id}",
    response_model=EventResponse,
    summary="Update an event",
)
async def update_event(event_id: UUID, event_update: EventUpdate):
    """Update an existing event."""
    try:
        # First check if event exists
        existing_event = await supabase_service.get_event_by_id(event_id)
        if not existing_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found",
            )

        update_data = event_update.model_dump(exclude_unset=True)
        updated_event = await supabase_service.update_event(event_id, update_data)

        return updated_event
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update event: {str(e)}",
        )


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an event",
)
async def delete_event(event_id: UUID):
    """Delete an event from the database."""
    try:
        # First check if event exists
        existing_event = await supabase_service.get_event_by_id(event_id)
        if not existing_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found",
            )

        await supabase_service.delete_event(event_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete event: {str(e)}",
        )



from fastapi import UploadFile, File
import uuid
import os

@router.post(
    "/upload-image",
    summary="Upload an image for an event",
    status_code=status.HTTP_200_OK,
)
async def upload_event_image(file: UploadFile = File(...), user=Depends(get_current_user)):
    """
    Upload event image. Only .jpg, .jpeg, .png, .webp allowed.
    The uploaded image is stored in Supabase Storage.
    """
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes .jpg, .png y .webp")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Extensión de archivo no permitida")

    try:
        from app.services.supabase_service import supabase_admin
        
        contents = await file.read()
        
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo excede el límite de 5MB")

        file_name = f"events/{user['id']}/{uuid.uuid4()}.{ext}"

        # Using venue-logos bucket to avoid creating a new public bucket manually
        supabase_admin.storage.from_("venue-logos").upload(
            file_name,
            contents,
            {"content-type": file.content_type, "upsert": "true"}
        )

        public_url = supabase_admin.storage.from_("venue-logos").get_public_url(file_name).rstrip('?')
        
        target_domain = os.getenv("API_PUBLIC_URL", "https://viveparche.cloud")
        if "localhost" in public_url or "127.0.0.1" in public_url:
            public_url = public_url.replace("http://localhost:8000", target_domain)
            public_url = public_url.replace("http://127.0.0.1:8000", target_domain)

        return {"image_url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in upload_event_image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{event_id}/view",
    summary="Track a user's view of an event",
    status_code=status.HTTP_200_OK,
)
async def track_event_view(event_id: UUID, request: Request):
    """
    Register that a logged-in user has viewed an event.
    12-hour cooldown: same user cannot increment view count more than once every 12 hours.
    Returns silently if user is not authenticated.
    """
    from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
    from datetime import datetime, timezone, timedelta

    # Try to extract auth token – view tracking is best-effort, never block
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return {"tracked": False, "reason": "not_authenticated"}

        token = auth_header.split(" ")[1]
        user_res = admin_client.auth.get_user(token)
        if not user_res or not user_res.user:
            return {"tracked": False, "reason": "invalid_token"}

        user_id = user_res.user.id
        entity_type = "event"
        entity_id = str(event_id)
        now = datetime.now(timezone.utc)
        cooldown_cutoff = (now - timedelta(hours=12)).isoformat()

        # Check if this user already viewed this event recently
        existing = admin_client.table("entity_views") \
            .select("id, last_viewed_at") \
            .eq("user_id", user_id) \
            .eq("entity_type", entity_type) \
            .eq("entity_id", entity_id) \
            .limit(1) \
            .execute()

        if existing.data:
            last_str = existing.data[0]["last_viewed_at"]
            if last_str:
                # Handle possible missing Z or different formats
                last_str = last_str.replace('Z', '+00:00')
                last = datetime.fromisoformat(last_str)
                # Ensure last is timezone aware
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                    
                if last > (now - timedelta(hours=12)):
                    return {"tracked": False, "reason": "cooldown_active"}
            
            # Update timestamp
            admin_client.table("entity_views") \
                .update({"last_viewed_at": now.isoformat()}) \
                .eq("id", existing.data[0]["id"]) \
                .execute()
        else:
            admin_client.table("entity_views").insert({
                "user_id": user_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "last_viewed_at": now.isoformat(),
            }).execute()

        # Increment Event view_count
        client = supabase_admin if supabase_admin else supabase
        # First get current count
        event_res = client.table("events").select("view_count").eq("id", str(event_id)).execute()
        if event_res.data:
            curr_views = event_res.data[0].get("view_count", 0) or 0
            client.table("events").update({"view_count": curr_views + 1}).eq("id", str(event_id)).execute()

        return {"tracked": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"VIEW TRACKING ERROR (event): {str(e)}")
        return {"tracked": False, "reason": str(e)}

