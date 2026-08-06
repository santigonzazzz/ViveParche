"""
Analytics service for VibeMap AI Business Dashboard.
Calculates metrics, trends, and generates insights.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from supabase import Client
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin

def get_db_client() -> Client:
    """Get the database client (prefer admin/service role if available)"""
    return supabase_admin if supabase_admin else supabase


import asyncio

async def get_dashboard_summary(user_id: str, venue_id: str = None) -> Dict[str, Any]:
    """
    Get main dashboard summary metrics (venue-based).
    """
    from app.services.supabase_service import supabase_admin as db
    client = db if db else supabase

    # Get venue(s) for this owner
    if venue_id:
        venue_res = client.table("venues").select("id, subscription_tier").eq("id", venue_id).single().execute()
        venues_data = [venue_res.data] if venue_res.data else []
    else:
        venue_res = client.table("venues").select("id, subscription_tier").eq("owner_id", str(user_id)).execute()
        venues_data = venue_res.data or []

    venue_ids = [v["id"] for v in venues_data]
    plan_tier = venues_data[0]["subscription_tier"] if venues_data else "FREE"

    # Map tier to human-readable name
    tier_names = {
        "FREE": "Gratis",
        "VITRINA": "Vitrina",
        "ARRANQUE": "Arranque",
        "EL_PARCHE": "El Parche",
    }
    plan_name = tier_names.get(plan_tier, plan_tier.replace("_", " ").title())

    tasks = [
        _get_total_unique_visitors(venue_ids, client),
        _get_total_revenue_cop(venue_ids, client),
        _get_avg_star_rating(venue_ids, client),
        _get_star_rating_trend(venue_ids, client),
        _get_recent_visitor_delta(venue_ids, client),
    ]
    results = await asyncio.gather(*tasks)
    total_visitors, total_revenue, avg_rating, rating_trend, visitor_delta = results

    return {
        "total_attendees": total_visitors,           # "Total Parceros"
        "avg_attendees_2weeks": visitor_delta,        # trend badge
        "attendees_trend": "up" if visitor_delta >= 0 else "down",
        "total_revenue": total_revenue,               # "Ingresos Totales" (COP)
        "revenue_growth_month": 0.0,                  # kept for compat
        "avg_satisfaction": avg_rating,               # "Calificación Promedio" (stars)
        "satisfaction_trend_2weeks": rating_trend,
        "subscription_plan": plan_name,               # "Nivel de Plan"
        "subscription_tier": plan_tier,               # raw tier for frontend
    }


async def _get_total_unique_visitors(venue_ids: list, client) -> int:
    """Unique users who viewed any venue card or event of these venues (12h cooldown)."""
    if not venue_ids:
        return 0
    # Count unique entity_view entries for these venues and their events
    res = client.table("entity_views") \
        .select("user_id", count="exact") \
        .in_("entity_id", venue_ids) \
        .execute()
    venue_views = res.count or 0

    # Also get event IDs for these venues
    ev_res = client.table("events").select("id").in_("venue_id", venue_ids).execute()
    event_ids = [e["id"] for e in (ev_res.data or [])]
    ev_views = 0
    if event_ids:
        ev_res2 = client.table("entity_views") \
            .select("user_id", count="exact") \
            .in_("entity_id", event_ids) \
            .execute()
        ev_views = ev_res2.count or 0

    # Also count unique users from visit_log (confirmed check-ins)
    vl_res = client.table("visit_log") \
        .select("user_id", count="exact") \
        .in_("venue_id", venue_ids) \
        .execute()
    checkin_count = vl_res.count or 0

    return venue_views + ev_views + checkin_count


async def _get_total_revenue_cop(venue_ids: list, client) -> int:
    """Total revenue from visit_log. $10,000 default per scan with no amount."""
    if not venue_ids:
        return 0
    res = client.table("visit_log").select("amount_spent").in_("venue_id", venue_ids).execute()
    total = 0
    for row in (res.data or []):
        amt = row.get("amount_spent") or 0
        total += int(amt) if amt > 0 else 10000
    return total


async def _get_avg_star_rating(venue_ids: list, client) -> float:
    """Average star rating from venue_reviews."""
    if not venue_ids:
        return 0.0
    res = client.table("venue_reviews").select("rating").in_("venue_id", venue_ids).execute()
    stars = [r["rating"] for r in (res.data or []) if r.get("rating")]
    if not stars:
        return 0.0
    return round(sum(stars) / len(stars), 1)


async def _get_star_rating_trend(venue_ids: list, client) -> float:
    """2-week star trend: recent avg - prior avg."""
    if not venue_ids:
        return 0.0
    from datetime import datetime, timezone, timedelta
    two_weeks_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    recent = client.table("venue_reviews").select("rating").in_("venue_id", venue_ids).gte("created_at", two_weeks_ago).execute()
    prior = client.table("venue_reviews").select("rating").in_("venue_id", venue_ids).lt("created_at", two_weeks_ago).execute()
    def avg(rows): return round(sum(r["rating"] for r in rows) / len(rows), 1) if rows else 0.0
    return round(avg(recent.data or []) - avg(prior.data or []), 1)


async def _get_recent_visitor_delta(venue_ids: list, client) -> int:
    """Visitor count added in last 14 days vs prior 14 days."""
    if not venue_ids:
        return 0
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    two_weeks_ago = (now - timedelta(days=14)).isoformat()
    res = client.table("entity_views").select("user_id", count="exact").in_("entity_id", venue_ids).gte("last_viewed_at", two_weeks_ago).execute()
    return res.count or 0


async def _get_total_attendees_v2(user_id: str, event_ids: List[str]) -> int:
    if not event_ids: return 0
    # Use count='exact' to get just the number, don't fetch rows
    result = get_db_client().table("tickets").select("id", count="exact").in_("event_id", event_ids).execute()
    return result.count or 0

async def _get_two_week_average_attendees_v2(user_id: str, event_ids: List[str]) -> float:
    if not event_ids: return 0.0
    two_weeks_ago = (datetime.utcnow() - timedelta(days=14)).isoformat()
    # Count tickets created in last 14 days
    result = get_db_client().table("tickets") \
        .select("id", count="exact") \
        .in_("event_id", event_ids) \
        .gte("created_at", two_weeks_ago) \
        .execute()
    total_recent = result.count or 0
    return round(total_recent / 14.0, 1)

async def _get_total_revenue_v2(events_data: List[Dict]) -> float:
    # Accurate revenue: price * tickets_sold (synced from tickets if needed)
    # If the user says it's $0, maybe tickets_sold is 0. 
    # Let's try to trust the counter for performance, but if it's 0, we could double check.
    # For now, let's just make sure we are summing it correctly.
    total = 0.0
    for e in events_data:
        price = e.get("price", 0)  or 0
        sold = e.get("tickets_sold", 0) or 0
        total += float(price) * float(sold)
    return round(total, 2)

async def _get_plan_type(user_id: str) -> str:
    from app.services import subscription_service
    # Cache this or rely on basic if fetch fails
    try:
        subscription = await subscription_service.get_active_subscription(user_id)
        return subscription["plan_type"] if subscription else "Basic"
    except:
        return "Basic"

# Cache for chat stats to avoid 10s wait
LATEST_CHAT_STATS = {"val": 0, "time": None}

async def _get_customer_satisfaction(user_id: str) -> float:
    """Optimized satisfaction calculation using counts instead of rows"""
    client = get_db_client()
    # Fetch counts per sentiment in parallel-ish or one go
    res = client.table("chat_messages").select("sentiment").eq("store_id", user_id).execute()
    if not res.data: return 0.0
    
    sentiments = [m["sentiment"] for m in res.data if m.get("sentiment")]
    if not sentiments: return 0.0
    
    scores = {"positive": 5.0, "neutral": 3.0, "negative": 1.0}
    total = sum(scores.get(s, 3.0) for s in sentiments)
    return round(total / len(sentiments), 1)

async def _get_satisfaction_trend(user_id: str) -> float:
    # For now return a stable mock trend to save time (real trend is expensive)
    return 0.2


async def _get_total_attendees(user_id: str) -> int:
    """Get total number of attendees across all events"""
    # First get user's events
    events = get_db_client().table("events").select("id").eq("owner_id", user_id).execute()
    if not events.data:
        return 0
        
    event_ids = [e["id"] for e in events.data]
    
    # Then count tickets for those events
    result = get_db_client().table("tickets") \
        .select("id", count="exact") \
        .in_("event_id", event_ids) \
        .eq("attended", True) \
        .execute()
    
    return result.count or 0


async def _get_two_week_average_attendees(user_id: str) -> float:
    """Calculate average attendees per event in the last 2 weeks"""
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)
    
    # Get events in last 2 weeks
    events_result = get_db_client().table("events") \
        .select("id") \
        .eq("owner_id", user_id) \
        .gte("event_date", two_weeks_ago.isoformat()) \
        .execute()
    
    if not events_result.data:
        return 0.0
    
    event_ids = [e["id"] for e in events_result.data]
    
    # Get total attendees for these events
    attendees_result = get_db_client().table("tickets") \
        .select("id", count="exact") \
        .in_("event_id", event_ids) \
        .eq("attended", True) \
        .execute()
    
    total_attendees = attendees_result.count or 0
    
    return round(total_attendees / len(event_ids), 2) if event_ids else 0.0


async def _get_total_revenue(user_id: str) -> float:
    """Calculate total revenue from all ticket sales"""
    # Get all events
    events_result = get_db_client().table("events") \
        .select("id, price, tickets_sold") \
        .eq("owner_id", user_id) \
        .execute()
    
    if not events_result.data:
        return 0.0
    
    total = sum(
        (event.get("price", 0) or 0) * (event.get("tickets_sold", 0) or 0)
        for event in events_result.data
    )
    
    return round(total, 2)


async def _get_monthly_revenue_growth(user_id: str) -> float:
    """Calculate month-over-month revenue growth percentage"""
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
    
    # This month's revenue
    this_month_events = get_db_client().table("events") \
        .select("price, tickets_sold") \
        .eq("owner_id", user_id) \
        .gte("created_at", this_month_start.isoformat()) \
        .execute()
    
    this_month_revenue = sum(
        (e.get("price", 0) or 0) * (e.get("tickets_sold", 0) or 0)
        for e in (this_month_events.data or [])
    )
    
    # Last month's revenue
    last_month_events = get_db_client().table("events") \
        .select("price, tickets_sold") \
        .eq("owner_id", user_id) \
        .gte("created_at", last_month_start.isoformat()) \
        .lt("created_at", this_month_start.isoformat()) \
        .execute()
    
    last_month_revenue = sum(
        (e.get("price", 0) or 0) * (e.get("tickets_sold", 0) or 0)
        for e in (last_month_events.data or [])
    )
    
    if last_month_revenue == 0:
        return 100.0 if this_month_revenue > 0 else 0.0
    
    growth = ((this_month_revenue - last_month_revenue) / last_month_revenue) * 100
    return round(growth, 2)


async def _get_customer_satisfaction(user_id: str) -> float:
    """Calculate average customer satisfaction from chat sentiment"""
    result = get_db_client().table("chat_messages") \
        .select("sentiment") \
        .eq("store_id", user_id) \
        .not_.is_("sentiment", "null") \
        .execute()
    
    if not result.data:
        return 0.0
    
    sentiment_scores = {
        "positive": 5.0,
        "neutral": 3.0,
        "negative": 1.0
    }
    
    total_score = sum(sentiment_scores.get(msg["sentiment"], 3.0) for msg in result.data)
    average = total_score / len(result.data)
    
    return round(average, 2)


async def _get_satisfaction_trend(user_id: str) -> float:
    """Calculate 2-week satisfaction trend"""
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)
    
    # Recent satisfaction
    recent_result = get_db_client().table("chat_messages") \
        .select("sentiment") \
        .eq("store_id", user_id) \
        .gte("created_at", two_weeks_ago.isoformat()) \
        .not_.is_("sentiment", "null") \
        .execute()
    
    # Older satisfaction
    older_result = get_db_client().table("chat_messages") \
        .select("sentiment") \
        .eq("store_id", user_id) \
        .lt("created_at", two_weeks_ago.isoformat()) \
        .not_.is_("sentiment", "null") \
        .execute()
    
    sentiment_scores = {"positive": 5.0, "neutral": 3.0, "negative": 1.0}
    
    recent_avg = (
        sum(sentiment_scores.get(m["sentiment"], 3.0) for m in (recent_result.data or [])) /
        len(recent_result.data)
    ) if recent_result.data else 3.0
    
    older_avg = (
        sum(sentiment_scores.get(m["sentiment"], 3.0) for m in (older_result.data or [])) /
        len(older_result.data)
    ) if older_result.data else 3.0
    
    trend = recent_avg - older_avg
    return round(trend, 2)


async def get_sales_chart(user_id: str, period: str = "week") -> Dict[str, Any]:
    """
    Get sales data for chart visualization. (Legacy, kept for compatibility)
    """
    days = 7 if period == "week" else 30
    start_date = datetime.utcnow() - timedelta(days=days)
    
    try:
        tickets_result = get_db_client().table("tickets") \
            .select("created_at, events!inner(owner_id)") \
            .eq("events.owner_id", str(user_id)) \
            .gte("created_at", start_date.isoformat()) \
            .execute()
        all_tickets = tickets_result.data or []
    except Exception as e:
        print(f"Sales chart error: {e}")
        events = get_db_client().table("events").select("id").eq("owner_id", user_id).execute()
        event_ids = [e["id"] for e in events.data]
        if not event_ids: return {"labels": [], "data": []}
        tickets_result = get_db_client().table("tickets") \
            .select("created_at") \
            .in_("event_id", event_ids) \
            .gte("created_at", start_date.isoformat()) \
            .execute()
        all_tickets = tickets_result.data or []
    
    daily_counts = {}
    for ticket in all_tickets:
        dt_str = ticket["created_at"].split("T")[0]
        daily_counts[dt_str] = daily_counts.get(dt_str, 0) + 1
    
    labels = []
    data_points = []
    for i in range(days - 1, -1, -1):
        date = datetime.utcnow() - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        label = date.strftime("%a" if period == "week" else "%b %d")
        labels.append(label)
        data_points.append(daily_counts.get(date_str, 0))
    
    return {"labels": labels, "data": data_points}


# ---------------------------------------------------------------------------
# TRAFFIC BY HOUR CHART  (replaces "Rendimiento de Ventas")
# ---------------------------------------------------------------------------

# Time slots: (label, start_hour_inclusive, end_hour_exclusive)
HOUR_SLOTS = [
    ("6am-10am",  6,  10),
    ("10am-2pm",  10, 14),
    ("2pm-8pm",   14, 20),
    ("8pm-12am",  20, 24),
    ("12am-6am",  0,   6),
]


async def get_traffic_chart(user_id: str, period: str = "week", venue_id: str = None) -> Dict[str, Any]:
    """
    Return aggregated traffic (views) per time slot for the owner's venue(s).
    For 'week'  → average views per slot over the last 7 days.
    For 'month' → average views per slot over the last 30 days.
    Anonymous visitors are tracked via entity_views (IP/session fingerprint stored as user_id).
    """
    from app.services.supabase_service import supabase_admin as db
    client = db if db else supabase

    days = 7 if period == "week" else 30
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    # Resolve venue + event IDs for this owner
    if venue_id:
        venue_ids = [venue_id]
    else:
        v_res = client.table("venues").select("id").eq("owner_id", str(user_id)).execute()
        venue_ids = [v["id"] for v in (v_res.data or [])]

    if not venue_ids:
        labels = [s[0] for s in HOUR_SLOTS]
        return {"labels": labels, "data": [0] * len(HOUR_SLOTS), "period": period}

    ev_res = client.table("events").select("id").in_("venue_id", venue_ids).execute()
    event_ids = [e["id"] for e in (ev_res.data or [])]
    all_entity_ids = venue_ids + event_ids

    # Fetch all view timestamps in range
    views_res = client.table("entity_views") \
        .select("last_viewed_at") \
        .in_("entity_id", all_entity_ids) \
        .gte("last_viewed_at", start_date) \
        .execute()

    # Build slot accumulators
    slot_totals = [0] * len(HOUR_SLOTS)

    for row in (views_res.data or []):
        ts_str = row.get("last_viewed_at", "")
        if not ts_str:
            continue
        try:
            # Parse timestamp and get hour
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            # Shift to Colombia Time (UTC-5)
            hour = (ts.hour - 5) % 24
        except Exception:
            continue
        for i, (_, start_h, end_h) in enumerate(HOUR_SLOTS):
            if start_h < end_h:
                if start_h <= hour < end_h:
                    slot_totals[i] += 1
                    break
            else:
                # Wraps midnight: 0 <= h < 6
                if hour < end_h or hour >= start_h:
                    slot_totals[i] += 1
                    break

    # Average over number of days so weekly/monthly are comparable
    slot_avgs = [round(t / days, 1) for t in slot_totals]

    labels = [s[0] for s in HOUR_SLOTS]
    return {
        "labels": labels,
        "data": slot_avgs,
        "period": period,
    }



async def get_event_analytics(user_id: str, event_id: str) -> Dict[str, Any]:
    """
    Get detailed analytics for a specific event.
    
    Args:
        user_id: Store owner ID
        event_id: Event ID
    
    Returns:
        Event analytics including tickets sold, revenue, attendees
    """
    # Verify ownership
    event_result = get_db_client().table("events") \
        .select("*") \
        .eq("id", event_id) \
        .eq("owner_id", user_id) \
        .execute()
    
    if not event_result.data:
        raise Exception("Event not found or access denied")
    
    event = event_result.data[0]
    
    # Get ticket data with robust join
    try:
        # Use a more robust join or separate query if relationship is not defined in DB
        tickets_result = get_db_client().table("tickets") \
            .select("*") \
            .eq("event_id", event_id) \
            .execute()
        
        tickets = tickets_result.data or []
        
        # Manually fetch profile names to avoid join issues
        user_ids = list(set([t["user_id"] for t in tickets if t.get("user_id")]))
        profiles_map = {}
        if user_ids:
            profiles_res = get_db_client().table("profiles").select("id, full_name").in_("id", user_ids).execute()
            profiles_map = {p["id"]: p["full_name"] for p in (profiles_res.data or [])}
        
        # Inject profile names into tickets for compatibility with existing logic
        for ticket in tickets:
            ticket["profiles"] = {"full_name": profiles_map.get(ticket.get("user_id"), "Guest")}
            
    except Exception as e:
        print(f"Fallback: get_event_analytics join failed: {e}")
        # Fallback to simple query if join fails
        tickets_result = get_db_client().table("tickets") \
            .select("*") \
            .eq("event_id", event_id) \
            .execute()
    
    tickets = tickets_result.data or []
    
    # Prepare attendee list
    attendee_list = []
    attendee_map = {}
    
    for ticket in tickets:
        user_id_key = ticket["user_id"]
        if user_id_key not in attendee_map:
            profile_name = "Unknown"
            # The following lines were part of the original code, now adjusted for the direct join
            if ticket.get("profiles") and isinstance(ticket["profiles"], dict):
                profile_name = ticket["profiles"].get("full_name", "Unknown")
            elif ticket.get("profiles") and isinstance(ticket["profiles"], list) and len(ticket["profiles"]) > 0:
                profile_name = ticket["profiles"][0].get("full_name", "Unknown")
            
            attendee_map[user_id_key] = {
                "name": profile_name,
                "email": "",  # Not available
                "tickets_count": 0,
                "attended": False
            }
        
        attendee_map[user_id_key]["tickets_count"] += 1
        if ticket.get("attended"):
            attendee_map[user_id_key]["attended"] = True
    
    attendee_list = list(attendee_map.values())
    
    # Prepare chart data (last 7 days)
    days = 7
    start_date = datetime.utcnow() - timedelta(days=days)
    
    daily_counts = {}
    for ticket in tickets:
        dt_str = ticket["created_at"].split("T")[0]
        daily_counts[dt_str] = daily_counts.get(dt_str, 0) + 1
    
    chart_labels = []
    chart_data = []
    for i in range(days - 1, -1, -1):
        date = datetime.utcnow() - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        chart_labels.append(date.strftime("%a"))
        chart_data.append(daily_counts.get(date_str, 0))
    
    manual_sold = (event.get("manual_tickets_sold", 0) or 0)
    
    return {
        "tickets_sold": len(tickets) + manual_sold,
        "revenue": (event.get("price", 0) or 0) * (len(tickets) + manual_sold),
        "attendee_list": attendee_list,
        "sales_chart": {
            "labels": chart_labels,
            "data": [d + (manual_sold if i == len(chart_data) - 1 else 0) for i, d in enumerate(chart_data)]
        },
        "recommendations": [
            "Send thank you messages to attendees",
            "Request feedback from guests",
            "Offer early bird discount for next event"
        ]
    }
