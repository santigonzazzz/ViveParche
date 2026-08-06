"""
Vibe Search Service for VibeMap AI.
Uses AI to semantically understand and match user intent with events and venues.
"""

import json
from typing import List, Dict, Any, Optional
from app.services.supabase_service import supabase_admin as admin_client
from app.services.openai_service import get_vibe_search_results


async def fetch_all_events() -> List[Dict[str, Any]]:
    """Fetch all published events from Supabase."""
    try:
        response = (
            admin_client.table("events")
            .select("id, title, description, event_date, location_address, price, total_tickets, tickets_sold, image_url, vibe_tags, venue_id, venues(*)")
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"Error fetching events for vibe search: {e}")
        return []


async def fetch_all_venues() -> List[Dict[str, Any]]:
    """Fetch all active venues from Supabase."""
    try:
        response = (
            admin_client.table("venues")
            .select("id, name, description, address, rating, vibe_tags, opening_hours, special_offers_json, image_url, gallery_images")
            .eq("status", "active")
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"Error fetching venues for vibe search: {e}")
        return []


def build_context_for_ai(events: List[Dict], venues: List[Dict]) -> str:
    """
    Build a rich, concise context string so the AI can make smart recommendations.
    Limits total size to avoid token limits.
    """
    context_parts = []

    # Events context (up to 50)
    if events:
        context_parts.append("=== AVAILABLE EVENTS ===")
        for e in events[:50]:
            vibe_tags = ", ".join(e.get("vibe_tags") or [])
            price = f"${e.get('price', 0)}" if e.get("price") else "Free"
            date = e.get("event_date", "TBD")[:10] if e.get("event_date") else "TBD"
            available = (e.get("total_tickets", 0) or 0) - (e.get("tickets_sold", 0) or 0)
            line = (
                f"[EVENT_ID:{e['id']}] {e.get('title', 'Unnamed')} | "
                f"Date: {date} | Price: {price} | Available tickets: {available} | "
                f"Vibe: {vibe_tags or 'general'} | "
                f"Address: {e.get('location_address', 'TBD')} | "
                f"Description: {(e.get('description') or '')[:200]}"
            )
            context_parts.append(line)

    # Venues context (up to 50)
    if venues:
        context_parts.append("\n=== AVAILABLE VENUES ===")
        for v in venues[:50]:
            vibe_tags = ", ".join(v.get("vibe_tags") or [])
            rating = v.get("rating", 0)
            
            # Format hours
            oh = v.get('opening_hours') or {}
            oh_summary = []
            for day, h in oh.items():
                if h.get('closed'):
                    oh_summary.append(f"{day[:3]}:Closed")
                else:
                    oh_summary.append(f"{day[:3]}:{h.get('open')}-{h.get('close')}")
            oh_str = " | ".join(oh_summary) if oh_summary else "N/A"

            # Format promos
            promos = v.get('special_offers_json') or []
            promo_str = " | ".join([f"{p.get('name')}: {p.get('description')}" for p in promos]) if promos else "None"

            line = (
                f"[VENUE_ID:{v['id']}] {v.get('name', 'Unnamed')} | "
                f"Rating: {rating}/5 | Vibe: {vibe_tags or 'general'} | "
                f"Hours: {oh_str} | Promos: {promo_str} | "
                f"Address: {v.get('address', 'TBD')} | "
                f"Description: {(v.get('description') or '')[:300]}"
            )
            context_parts.append(line)

    return "\n".join(context_parts)


async def vibe_search(query: str) -> Dict[str, Any]:
    """
    Main vibe search function. Takes a natural language query and
    returns AI-ranked events and venues with an explanation message.
    """
    # Fetch data in parallel-like fashion
    events = await fetch_all_events()
    venues = await fetch_all_venues()

    if not events and not venues:
        return {
            "events": [],
            "venues": [],
            "ai_message": "No experiences found in the database yet.",
            "event_ids": [],
            "venue_ids": []
        }

    # Build context
    context = build_context_for_ai(events, venues)

    # Get AI-ranked results
    ai_result = await get_vibe_search_results(query=query, context=context)

    # Extract matched IDs from AI response
    matched_event_ids = set(ai_result.get("event_ids", []))
    matched_venue_ids = set(ai_result.get("venue_ids", []))

    # Filter the full objects to only return matched ones (in AI's preferred order)
    events_map = {str(e["id"]): e for e in events}
    venues_map = {str(v["id"]): v for v in venues}

    matched_events = [events_map[eid] for eid in ai_result.get("event_ids", []) if eid in events_map]
    matched_venues = [venues_map[vid] for vid in ai_result.get("venue_ids", []) if vid in venues_map]

    return {
        "events": matched_events,
        "venues": matched_venues,
        "ai_message": ai_result.get("message", "Here are the best experiences for your vibe!"),
        "event_ids": list(matched_event_ids),
        "venue_ids": list(matched_venue_ids)
    }
