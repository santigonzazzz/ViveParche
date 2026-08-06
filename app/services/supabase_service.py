"""
Supabase service for VibeMap AI.
Handles all database interactions with Supabase.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from supabase import create_client, Client
from app.config import settings

# Initialize Supabase client
print(f"DEBUG - LLAVE EN USO: {settings.supabase_key[:30]}...")
print(f"=" * 40)
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

# Initialize Admin client (bypasses RLS) if service key is available
supabase_admin: Optional[Client] = None
if settings.supabase_service_key:
    try:
        supabase_admin = create_client(settings.supabase_url, settings.supabase_service_key)
        print("[OK] Supabase Admin (Service Role) client initialized.")
    except Exception as e:
        print(f"[WARNING] Warning: Failed to initialize Supabase Admin client with provided key: {e}")
        print("Backend will fall back to using standard SUPABASE_KEY (RLS will be active)")

def _get_client(admin: bool = False) -> Client:
    """Helper to get either the standard or admin client."""
    if admin and supabase_admin:
        return supabase_admin
    return supabase

# ==================== MUNICIPALITY OPERATIONS ====================


async def create_municipality(municipality_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new municipality in the database."""
    try:
        response = admin_client.table("municipalities").insert(municipality_data).execute()
        if response.data:
            return response.data[0]
        raise Exception("Failed to create municipality")
    except Exception as e:
        raise Exception(f"Database error creating municipality: {str(e)}")


async def get_municipalities() -> List[Dict[str, Any]]:
    """Retrieve all municipalities from the database."""
    try:
        # Use admin client so RLS doesn't block public reads on reference data
        response = supabase_admin.table("municipalities").select("*").order("name").execute()
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching municipalities: {str(e)}")


async def get_municipality_by_id(municipality_id: UUID) -> Optional[Dict[str, Any]]:
    """Retrieve a specific municipality by ID."""
    try:
        response = (
            admin_client.table("municipalities")
            .select("*")
            .eq("id", str(municipality_id))
            .execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Database error fetching municipality: {str(e)}")


async def get_municipality_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Retrieve a municipality by slug."""
    try:
        response = (
            admin_client.table("municipalities").select("*").eq("slug", slug).execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Database error fetching municipality by slug: {str(e)}")


# ==================== EVENT OPERATIONS ====================


async def create_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new event in the database.

    Args:
        event_data: Dictionary containing event fields

    Returns:
        Created event data

    Raises:
        Exception: If database operation fails
    """
    try:
        # Convert UUIDs to strings for Supabase
        prepared_data = event_data.copy()
        if "municipality_id" in prepared_data and isinstance(
            prepared_data["municipality_id"], UUID
        ):
            prepared_data["municipality_id"] = str(prepared_data["municipality_id"])
        if "owner_id" in prepared_data and isinstance(
            prepared_data["owner_id"], UUID
        ):
            prepared_data["owner_id"] = str(prepared_data["owner_id"])
        
        if "venue_id" in prepared_data and isinstance(
            prepared_data["venue_id"], UUID
        ):
            prepared_data["venue_id"] = str(prepared_data["venue_id"])
        
        # Convert datetime to ISO format string
        if "event_date" in prepared_data and isinstance(prepared_data["event_date"], datetime):
             prepared_data["event_date"] = prepared_data["event_date"].isoformat()

        response = _get_client(admin=True).table("events").insert(prepared_data).execute()
        if response.data:
            return response.data[0]
        raise Exception("Failed to create event")
    except Exception as e:
        raise Exception(f"Database error creating event: {str(e)}")


async def get_events() -> List[Dict[str, Any]]:
    """
    Retrieve all events from the database.

    Returns:
        List of all events

    Raises:
        Exception: If database operation fails
    """
    try:
        now = datetime.utcnow().isoformat()
        response = (
            _get_client(admin=True).table("events")
            .select("*")
            .gte("event_date", now)
            .order("event_date")
            .execute()
        )
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching events: {str(e)}")


async def get_event_by_id(event_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a specific event by ID or Slug.
    """
    try:
        query = _get_client(admin=True).table("events").select("*")
        
        # Check if it's a valid UUID
        try:
            from uuid import UUID
            UUID(str(event_id))
            query = query.eq("id", str(event_id))
        except (ValueError, TypeError):
            # Assume it's a slug
            query = query.eq("slug", str(event_id))
            
        response = query.execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Database error fetching event: {str(e)}")


async def get_events_by_municipality(municipality_id: UUID) -> List[Dict[str, Any]]:
    """
    Retrieve all events for a specific municipality.

    Args:
        municipality_id: The UUID of the municipality to filter by

    Returns:
        List of events in the specified municipality

    Raises:
        Exception: If database operation fails
    """
    try:
        response = (
            _get_client(admin=True).table("events")
            .select("*")
            .eq("municipality_id", str(municipality_id))
            .execute()
        )
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching events by municipality: {str(e)}")


async def get_events_by_vibe_tags(vibe_tags: List[str]) -> List[Dict[str, Any]]:
    """
    Retrieve events that match any of the specified vibe tags.

    Args:
        vibe_tags: List of vibe tags to filter by

    Returns:
        List of matching events

    Raises:
        Exception: If database operation fails
    """
    try:
        response = (
            _get_client(admin=True).table("events")
            .select("*")
            .overlaps("vibe_tags", vibe_tags)
            .execute()
        )
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching events by vibe tags: {str(e)}")

async def get_events_by_owner(owner_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve all events for a specific owner.
    Uses admin client to ensure full visibility for management.
    """
    try:
        client = supabase_admin if supabase_admin else supabase
        response = (
            client.table("events")
            .select("*, event_perks(count)")
            .eq("owner_id", str(owner_id))
            .order("event_date", desc=True)
            .execute()
        )
        
        # Format the count to be a simple number
        if response.data:
            for event in response.data:
                perks_data = event.get("event_perks", [])
                if isinstance(perks_data, list) and len(perks_data) > 0:
                    event["perks_count"] = perks_data[0].get("count", 0)
                else:
                    event["perks_count"] = 0
                # Clean up the nested object
                if "event_perks" in event:
                    del event["event_perks"]
                    
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching events by owner: {str(e)}")

async def search_events(query: str) -> List[Dict[str, Any]]:
    """
    Search for events matching a query string in title or description.
    """
    try:
        response = (
            _get_client(admin=True).table("events")
            .select("*, venues(*)")
            .or_(f"title.ilike.%{query}%,description.ilike.%{query}%")
            .execute()
        )
        return response.data
    except Exception as e:
        raise Exception(f"Database error searching events: {str(e)}")

async def search_venues(query: str) -> List[Dict[str, Any]]:
    """
    Search for venues matching a query string in name or description.
    """
    try:
        response = (
            _get_client(admin=True).table("venues")
            .select("*")
            .in_("subscription_status", ["active", "pending_approval"])
            .or_(f"name.ilike.%{query}%,description.ilike.%{query}%")
            .execute()
        )
        return response.data
    except Exception as e:
        raise Exception(f"Database error searching venues: {str(e)}")

async def update_event(
    event_id: UUID, update_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Update an existing event.
    
    # ... docstring ...
    """
    try:
        # Filter out None values
        filtered_data = {k: v for k, v in update_data.items() if v is not None}

        if not filtered_data:
            return await get_event_by_id(event_id)

        # Convert UUIDs to strings
        if "municipality_id" in filtered_data and isinstance(
            filtered_data["municipality_id"], UUID
        ):
            filtered_data["municipality_id"] = str(filtered_data["municipality_id"])
        
        if "owner_id" in filtered_data and isinstance(
            filtered_data["owner_id"], UUID
        ):
            filtered_data["owner_id"] = str(filtered_data["owner_id"])
            
        if "venue_id" in filtered_data and isinstance(
            filtered_data["venue_id"], UUID
        ):
            filtered_data["venue_id"] = str(filtered_data["venue_id"])

        # Convert datetime to ISO format string
        if "event_date" in filtered_data and isinstance(filtered_data["event_date"], datetime):
             filtered_data["event_date"] = filtered_data["event_date"].isoformat()

        response = (
            _get_client(admin=True).table("events")
            .update(filtered_data)
            .eq("id", str(event_id))
            .execute()
        )

        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Database error updating event: {str(e)}")


async def delete_event(event_id: UUID) -> bool:
    """
    Delete an event from the database.

    Args:
        event_id: The UUID of the event to delete

    Returns:
        True if deleted successfully

    Raises:
        Exception: If database operation fails
    """
    try:
        response = _get_client(admin=True).table("events").delete().eq("id", str(event_id)).execute()
        return True
    except Exception as e:
        raise Exception(f"Database error deleting event: {str(e)}")


# ==================== BOOKING OPERATIONS ====================


async def create_booking(booking_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new booking in the database.

    Args:
        booking_data: Dictionary containing booking fields

    Returns:
        Created booking data

    Raises:
        Exception: If database operation fails
    """
    try:
        # Convert UUIDs to strings for Supabase
        prepared_data = booking_data.copy()
        if "event_id" in prepared_data and isinstance(prepared_data["event_id"], UUID):
            prepared_data["event_id"] = str(prepared_data["event_id"])
        if "user_id" in prepared_data and isinstance(prepared_data["user_id"], UUID):
            prepared_data["user_id"] = str(prepared_data["user_id"])

        response = admin_client.table("bookings").insert(prepared_data).execute()
        if response.data:
            return response.data[0]
        raise Exception("Failed to create booking")
    except Exception as e:
        raise Exception(f"Database error creating booking: {str(e)}")


async def get_bookings() -> List[Dict[str, Any]]:
    """
    Retrieve all bookings from the database.

    Returns:
        List of all bookings

    Raises:
        Exception: If database operation fails
    """
    try:
        response = admin_client.table("bookings").select("*").execute()
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching bookings: {str(e)}")


async def get_booking_by_id(booking_id: UUID) -> Optional[Dict[str, Any]]:
    """
    Retrieve a specific booking by ID.

    Args:
        booking_id: The UUID of the booking to retrieve

    Returns:
        Booking data if found, None otherwise

    Raises:
        Exception: If database operation fails
    """
    try:
        response = (
            admin_client.table("bookings").select("*").eq("id", str(booking_id)).execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Database error fetching booking: {str(e)}")


async def get_bookings_by_user(user_id: UUID) -> List[Dict[str, Any]]:
    """
    Retrieve all bookings for a specific user.

    Args:
        user_id: The UUID of the user

    Returns:
        List of user's bookings

    Raises:
        Exception: If database operation fails
    """
    try:
        response = (
            admin_client.table("bookings").select("*").eq("user_id", str(user_id)).execute()
        )
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching user bookings: {str(e)}")


async def get_bookings_by_event(event_id: UUID) -> List[Dict[str, Any]]:
    """
    Retrieve all bookings for a specific event.

    Args:
        event_id: The UUID of the event

    Returns:
        List of event bookings

    Raises:
        Exception: If database operation fails
    """
    try:
        response = (
            admin_client.table("bookings")
            .select("*")
            .eq("event_id", str(event_id))
            .execute()
        )
        return response.data
    except Exception as e:
        raise Exception(f"Database error fetching event bookings: {str(e)}")


async def update_booking(
    booking_id: UUID, update_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Update an existing booking.

    Args:
        booking_id: The UUID of the booking to update
        update_data: Dictionary containing fields to update

    Returns:
        Updated booking data if found, None otherwise

    Raises:
        Exception: If database operation fails
    """
    try:
        # Filter out None values
        filtered_data = {k: v for k, v in update_data.items() if v is not None}

        if not filtered_data:
            return await get_booking_by_id(booking_id)

        response = (
            admin_client.table("bookings")
            .update(filtered_data)
            .eq("id", str(booking_id))
            .execute()
        )

        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Database error updating booking: {str(e)}")


async def delete_booking(booking_id: UUID) -> bool:
    """
    Delete a booking from the database.

    Args:
        booking_id: The UUID of the booking to delete

    Returns:
        True if deleted successfully

    Raises:
        Exception: If database operation fails
    """
    try:
        response = (
            admin_client.table("bookings").delete().eq("id", str(booking_id)).execute()
        )
        return True
    except Exception as e:
        raise Exception(f"Database error deleting booking: {str(e)}")
