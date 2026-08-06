"""
Venue service for VibeMap AI.
Handles venue registration, opening hours logic, and discovery.
"""

import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
from app.models.venue import VenueCreate, VenueUpdate


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in kilometers.
    """
    # Convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers. Use 3956 for miles
    return c * r


def is_venue_open(opening_hours: Optional[Dict[str, Any]]) -> bool:
    """
    Check if a venue is currently open based on its opening hours.
    Uses Colombia time (UTC-5).
    Expects format: {"monday": {"open": "08:00", "close": "22:00", "closed": false}, ...}
    """
    if not opening_hours:
        return False

    # Colombia is UTC-5 (no DST)
    colombia_tz = timezone(timedelta(hours=-5))
    now = datetime.now(colombia_tz)
    day_name = now.strftime("%A").lower()
    
    day_hours = opening_hours.get(day_name)
    if not day_hours or day_hours.get("closed") is True:
        return False

    open_str = day_hours.get("open")
    close_str = day_hours.get("close")
    
    if not open_str or not close_str:
        return False

    current_time = now.strftime("%H:%M")
    
    # Handle overnight hours
    if close_str < open_str:
        return current_time >= open_str or current_time <= close_str
    
    return open_str <= current_time <= close_str


def calculate_completion_percentage(venue: Dict[str, Any]) -> int:
    """
    Calculate profile completion percentage based on weighted criteria (Total 100%).
    - Description: 15%
    - Opening hours: 15% 
    - Image: 20%
    - Address: 15%
    - WhatsApp: 15%
    - Menu items: 10%
    - Special Offers: 10%
    """
    score = 0
    
    if venue.get("description") and len(venue.get("description", "")) > 10:
        score += 15
    if venue.get("opening_hours"):
        score += 15
    if venue.get("image_url") and "placeholder" not in venue.get("image_url", "").lower():
        score += 20
    if venue.get("address"):
        score += 15
    if venue.get("whatsapp_number"):
        score += 15
    
    # Check for menu items or PDF menu
    items_count = venue.get("_items_count", 0)
    if items_count > 0 or venue.get("menu_url"):
        score += 10

    # Check for special offers (manual or PDF)
    # Note: frontend sends special_offers_json, backend might have special_offers_json or special_offers_pdf_url
    offers_json = venue.get("special_offers_json")
    if (offers_json and len(offers_json) > 0) or venue.get("special_offers_pdf_url"):
        score += 10
    
    return score


async def register_venue(venue_data: VenueCreate) -> Dict[str, Any]:
    """Register a new venue."""
    data = {k: v for k, v in venue_data.model_dump().items() if v is not None}
    
    if "owner_id" in data:
        data["owner_id"] = str(data["owner_id"])
    if "municipality_id" in data:
        data["municipality_id"] = str(data["municipality_id"])
    
    # Set default status to 'active' so it shows up on landing page discovery
    data["subscription_status"] = "active"
    
    res = admin_client.table("venues").insert(data).execute()
    return res.data[0]


async def get_owner_venue(owner_id: UUID) -> Optional[Dict[str, Any]]:
    """Get venue by owner ID with completion percentage and items count."""
    res = admin_client.table("venues").select("*").eq("owner_id", str(owner_id)).execute()
    if not res.data:
        return None
    
    venue = res.data[0]
    
    # Get items count
    items_res = admin_client.table("venue_items").select("id", count="exact").eq("venue_id", venue["id"]).execute()
    venue["_items_count"] = items_res.count if items_res.count else 0
    
    # Calculate completion
    venue["completion_percentage"] = calculate_completion_percentage(venue)
    venue["is_open"] = is_venue_open(venue.get("opening_hours"))
    
    return venue


async def get_venue(venue_id: str, user_lat: Optional[float] = None, user_lon: Optional[float] = None) -> Dict[str, Any]:
    """Get venue details and its active events by ID or Slug."""
    # Try to determine if input is UUID or Slug
    try:
        from uuid import UUID
        UUID(str(venue_id))
        query = supabase_admin.table("venues").select("*").eq("id", str(venue_id))
    except (ValueError, TypeError):
        query = supabase_admin.table("venues").select("*").eq("slug", str(venue_id))
        
    res = query.execute()
    if not res.data:
        raise Exception("Venue not found")
    
    venue = res.data[0]
    venue["is_open"] = is_venue_open(venue.get("opening_hours"))
    
    # Calculate distance if user coords provided
    if user_lat is not None and user_lon is not None and venue.get("latitude") and venue.get("longitude"):
        venue["distance_km"] = calculate_distance(user_lat, user_lon, venue["latitude"], venue["longitude"])
    
    # Fetch active events for this venue
    now = datetime.now().isoformat()
    events_res = supabase_admin.table("events").select("*").eq("venue_id", str(venue["id"])).gte("event_date", now).execute()
    venue["events"] = events_res.data
    
    return venue


async def update_venue(venue_id: UUID, venue_data: VenueUpdate) -> Dict[str, Any]:
    """Update venue details."""
    data = {k: v for k, v in venue_data.model_dump().items() if v is not None}
    if "municipality_id" in data:
        data["municipality_id"] = str(data["municipality_id"])
    
    # Force updated_at for transparency
    from datetime import datetime, timezone
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    print(f"DEBUG: update_venue sending to Supabase: {data}")
    res = supabase_admin.table("venues").update(data).eq("id", str(venue_id)).execute()
    print(f"DEBUG: update_venue Supabase response: {res.data}")
    if not res.data:
        print(f"DEBUG: update_venue FAILED - res.data is empty. Check RLS or ID.")
        
    return res.data[0] if res.data else {}


async def get_discovery_data(municipality_id: UUID, user_lat: Optional[float] = None, user_lon: Optional[float] = None) -> Dict[str, Any]:
    """
    Get discovery data for a municipality.
    - Prioritizes local results by subscription tier.
    - Falls back to global results if local content is scarce.
    """
    now = datetime.now().isoformat()
    tier_priority = {"PRO": 0, "EL PARCHE": 1, "EL_PARCHE": 1, "ARRANQUE": 2, "FREE": 3, "VITRINA": 3}

    # 1. Fetch Local Events
    events_res = supabase_admin.table("events").select("*, venues(*)").eq("municipality_id", str(municipality_id)).gte("event_date", now).order("event_date").limit(10).execute()
    events = events_res.data
    
    # Global fallback for events if few local ones
    if len(events) < 5:
        global_events_res = supabase_admin.table("events").select("*, venues(*)").neq("municipality_id", str(municipality_id)).gte("event_date", now).order("event_date").limit(5).execute()
        # Add global events that aren't already included
        existing_event_ids = {e["id"] for e in events}
        for e in global_events_res.data:
            if e["id"] not in existing_event_ids:
                events.append(e)

    # 2. Fetch Venues (Local first)
    # We include 'pending_approval' so new venues show up during testing/billing flow
    venues_res = supabase_admin.table("venues").select("*") \
        .eq("municipality_id", str(municipality_id)) \
        .in_("subscription_status", ["active", "pending_approval"]) \
        .execute()
    
    venues_dict = {v["id"]: v for v in venues_res.data}
    
    # Global fallback for venues if local count is low (< 10)
    if len(venues_dict) < 10:
        # Fetch high-tier venues globally
        global_venues_res = supabase_admin.table("venues").select("*") \
            .neq("municipality_id", str(municipality_id)) \
            .in_("subscription_status", ["active", "pending_approval"]) \
            .order("rating", desc=True).limit(10).execute()
            
        for v in global_venues_res.data:
            if v["id"] not in venues_dict:
                venues_dict[v["id"]] = v

    venues = list(venues_dict.values())
    
    # Sorting logic:
    # 1. Priority Tiers (PRO, EL PARCHE...)
    # 2. Local vs Global (matching municipality_id)
    # 3. Rating
    def discovery_sort_key(v):
        tier = tier_priority.get(v.get("subscription_tier", "FREE"), 3)
        is_local = 0 if str(v.get("municipality_id")) == str(municipality_id) else 1
        rating = -v.get("rating", 0)
        return (tier, is_local, rating)

    venues.sort(key=discovery_sort_key)
    
    # Limit to top results for the response
    venues = venues[:15]

    for v in venues:
        v["is_open"] = is_venue_open(v.get("opening_hours"))
        
        # Get items count for completion
        items_res = supabase_admin.table("venue_items").select("id", count="exact").eq("venue_id", v["id"]).execute()
        v["_items_count"] = items_res.count if items_res.count else 0
        v["completion_percentage"] = calculate_completion_percentage(v)
        
        if user_lat is not None and user_lon is not None and v.get("latitude") and v.get("longitude"):
            v["distance_km"] = calculate_distance(user_lat, user_lon, v["latitude"], v["longitude"])
            
    # Calculate distances for events via their venues
    for e in events:
        v_data = e.get("venues")
        if v_data and user_lat is not None and user_lon is not None and v_data.get("latitude") and v_data.get("longitude"):
            e["distance_km"] = calculate_distance(user_lat, user_lon, v_data["latitude"], v_data["longitude"])

    return {
        "events": events[:10],
        "venues": venues
    }

async def submit_payment_proof(venue_id: UUID, plan_type: str, file_url: str) -> Dict[str, Any]:
    """
    Submit a payment proof for a venue.
    Updates the venue's billing status to 'pending' and stores the proof URL.
    """
    data = {
        "last_payment_proof": file_url,
        "billing_status": "pending",
        "subscription_status": "pending_approval",
        "plan_type": plan_type, # New column
        "subscription_tier": plan_type, # Sync for compatibility
    }
    
    res = admin_client.table("venues").update(data).eq("id", str(venue_id)).execute()
    return res.data[0]
