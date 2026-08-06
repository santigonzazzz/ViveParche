"""
Perk Service for VibeMap AI.
Handles creation, retrieval, and management of event perks/coupons.
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin

async def create_perk(perk_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new perk for an event.
    """
    try:
        # Ensure active defaults to True if not provided
        if "active" not in perk_data:
            perk_data["active"] = True
            
        # Convert UUIDs to strings
        if "event_id" in perk_data and isinstance(perk_data["event_id"], UUID):
            perk_data["event_id"] = str(perk_data["event_id"])

        # Use admin client to bypass RLS - ownership is already verified by API auth
        response = supabase_admin.table("event_perks").insert(perk_data).execute()
        if response.data:
            return response.data[0]
        raise Exception("Failed to create perk")
    except Exception as e:
        raise Exception(f"Database error creating perk: {str(e)}")


async def get_event_perks(event_id: str, active_only: bool = False) -> List[Dict[str, Any]]:
    """
    Get all perks for a specific event.
    """
    try:
        # Use admin to ensure we see all perks in management views
        query = supabase_admin.table("event_perks").select("*").eq("event_id", event_id)
        
        if active_only:
            query = query.eq("active", True)
            
        # Order by creation date descending
        query = query.order("created_at", desc=True)
        
        response = query.execute()
        return response.data or []
    except Exception as e:
        raise Exception(f"Database error fetching perks: {str(e)}")


async def update_perk(perk_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a perk.
    """
    try:
        response = supabase_admin.table("event_perks").update(update_data).eq("id", perk_id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Database error updating perk: {str(e)}")


from datetime import datetime, timedelta, timezone

async def delete_perk(perk_id: str) -> bool:
    """
    Delete a perk.
    Restriction: Cannot delete if event starts in < 2 hours.
    """
    try:
        # Use admin client to find event_id (bypass RLS)
        perk_response = supabase_admin.table("event_perks").select("event_id").eq("id", perk_id).execute()
        if not perk_response.data:
            raise Exception("Perk not found")
        
        event_id = perk_response.data[0]["event_id"]
        
        # Get event date
        event_response = supabase_admin.table("events").select("event_date").eq("id", event_id).execute()
        if event_response.data:
            event_date_str = event_response.data[0]["event_date"]
            if event_date_str:
                event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
                
                # Check 2 hour window
                now = datetime.now(timezone.utc)
                time_until_event = event_date - now
                
                if timedelta(hours=0) < time_until_event < timedelta(hours=2):
                    raise Exception("Cannot delete perk: Event starts in less than 2 hours")

        response = supabase_admin.table("event_perks").delete().eq("id", perk_id).execute()
        return True
    except Exception as e:
        raise Exception(f"Database error deleting perk: {str(e)}")


async def get_active_perks_for_owner(owner_id: str) -> List[Dict[str, Any]]:
    """
    Get all active perks for all events owned by a specific owner.
    """
    try:
        # First, get all event IDs for this owner
        events_response = admin_client.table("events").select("id").eq("owner_id", owner_id).execute()
        event_ids = [str(item["id"]) for item in events_response.data] if events_response.data else []
        
        if not event_ids:
            return []
            
        # Then, get active perks for these events
        response = (
            admin_client.table("event_perks")
            .select("*")
            .in_("event_id", event_ids)
            .eq("active", True)
            .order("created_at", desc=True)
            .limit(5)  # Limit for dashboard view
            .execute()
        )
        return response.data or []
    except Exception as e:
        raise Exception(f"Database error fetching active perks: {str(e)}")
