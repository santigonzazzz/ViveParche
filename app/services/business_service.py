"""
Business and Analytics service for VibeMap AI.
Handles metrics aggregation, AI co-pilot logic, and team invites.
"""

import os
import secrets
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from supabase import Client
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin

def get_db_client() -> Client:
    """Get the database client (prefer admin/service role if available)"""
    return supabase_admin if supabase_admin else supabase


async def get_owner_dashboard(owner_id: str) -> Dict[str, Any]:
    """Aggregate dashboard metrics for the store owner."""
    db = get_db_client()

    # 1. Fetch all events and venue for this owner
    events_res = db.table("events").select("id, price").eq("owner_id", owner_id).execute()
    events = events_res.data or []
    event_ids = [e["id"] for e in events]

    venue_res = db.table("venues").select("id, rating").eq("owner_id", owner_id).limit(1).execute()
    venue_data = (venue_res.data or [{}])[0]
    venue_id = venue_data.get("id")

    # 2. Total unique views (Parceros) - count distinct entity_views entries for this owner's venue + events
    entity_ids = event_ids + ([venue_id] if venue_id else [])
    total_views = 0
    if entity_ids:
        views_res = db.table("entity_views").select("id", count="exact").in_("entity_id", entity_ids).execute()
        total_views = views_res.count or 0

    # 3. Average rating from real reviews
    avg_rating = venue_data.get("rating", 0.0) or 0.0

    # 4. Total reviews
    total_reviews = 0
    if venue_id:
        reviews_res = db.table("venue_reviews").select("id", count="exact").eq("venue_id", venue_id).execute()
        total_reviews = reviews_res.count or 0

    return {
        "metrics": {
            "total_attendees": total_views,
            "attendee_growth_pct": 0,
            "total_revenue": 0,
            "revenue_growth_pct": 0,
            "customer_sentiment": avg_rating,
            "sentiment_growth_pct": 0,
            "total_reviews": total_reviews,
            "avg_rating": avg_rating,
        },
        "graphic_data": [
            {"day": "Mon", "sales": 0},
            {"day": "Tue", "sales": 0},
            {"day": "Wed", "sales": 0},
            {"day": "Thu", "sales": 0},
            {"day": "Fri", "sales": 0},
            {"day": "Sat", "sales": 0},
            {"day": "Sun", "sales": 0},
        ]
    }



async def get_ai_suggestions(owner_id: str) -> List[Dict[str, Any]]:
    """Return AI recommendations based on context (weather, history)."""
    # Logic: If no recent campaigns, generate mock ones based on "Rain" or "Trend"
    # In production, this would query OpenAI
    
    suggestions = [
        {
            "id": "reco_001",
            "type": "Suggestion",
            "title": "Weather Alert: Rainy Weekend 🌧️",
            "content": "It looks like rain this weekend in Medellin. Foot traffic might drop by 15%. I've drafted a promo for indoor seating to boost retention.",
            "action": "Send Promo"
        },
        {
            "id": "reco_002",
            "title": "Trend Insight: Industrial Vibe",
            "content": "The 'Industrial' aesthetic is trending with your 18-25 demographic. Consider adding a 'Cyberpunk' special for next Friday.",
            "action": "Draft Event"
        }
    ]
    return suggestions


async def execute_campaign(owner_id: str, campaign_id: str) -> Dict[str, Any]:
    """Simulate sending a marketing campaign."""
    # Logic: Mark in DB, send notifications to interested users
    campaign_data = {
        "store_id": owner_id,
        "suggestion_type": "promotion",
        "suggestion_content": f"Campaign {campaign_id} executed.",
        "sent_at": datetime.utcnow().isoformat()
    }
    get_db_client().table("ai_campaigns").insert(campaign_data).execute()
    
    return {"status": "success", "message": "Campaign sent to Whatsapp, Email and App notifications."}


async def invite_member(owner_id: str, role: str) -> Dict[str, Any]:
    """Generate a unique invitation code for team members."""
    invite_code = secrets.token_hex(4).upper() # e.g. AB12CD34
    
    data = {
        "store_id": owner_id,
        "role": role,
        "invitation_code": invite_code,
        "accepted": False
    }
    
    res = get_db_client().table("team_members").insert(data).execute()
    return {
        "invitation_code": invite_code,
        "link": f"http://vibemap.ai/join?code={invite_code}",
        "role": role
    }


async def join_team(user_id: str, code: str) -> Dict[str, Any]:
    """Use an invitation code to join a staff team."""
    res = get_db_client().table("team_members").select("*").eq("invitation_code", code).eq("accepted", False).execute()
    if not res.data:
        raise Exception("Invalid or already used invitation code")
        
    invitation = res.data[0]
    
    # Update Record
    get_db_client().table("team_members").update({"user_id": user_id, "accepted": True}).eq("id", invitation["id"]).execute()
    
    # Update Profile role
    get_db_client().table("profiles").update({"role": invitation["role"]}).eq("id", user_id).execute()
    
    return {"status": "success", "message": f"Successfully joined as {invitation['role']}"}


async def get_event_analytics(owner_id: str, event_id: Optional[str] = None) -> Dict[str, Any]:
    """Return detailed analytics including sentiment and AI co-pilot insights."""
    # Mock aggregation for analytics page
    return {
        "roi": "450%",
        "new_customers": 120,
        "promo_redemptions": 45,
        "cost_per_lead": "$0.85",
        "sentiment": {
            "positive": 85,
            "neutral": 10,
            "negative": 5,
            "mood": "Excellent"
        },
        "ai_insights": [
                        "Users are highly engaged with the 'Industrial' aesthetic.",
            "Parking concerns mentioned in 12% of chats. Suggest including travel tips."
        ],
        "copilot_stats": {
            "messages_sent": 1200,
            "engagement_rate": "18%",
            "top_triggers": [
                {"labels": "Dress code inquiries", "count": 1200},
                {"labels": "VIP Table bookings", "count": 840}
            ]
        }
    }
