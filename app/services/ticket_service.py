"""
Ticket service for VibeMap AI.
Handles reservations (holds), purchasing, and validation.
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID
from supabase import create_client, Client
from app.config import settings
from app.services import supabase_service
from app.services.settings_service import create_notification

# Use shared clients from supabase_service
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin


async def reserve_tickets(user_id: str, req: Any) -> Dict[str, Any]:
    """Lock tickets for a user for 15 minutes."""
    # 1. Check event exists and capacity
    event = await supabase_service.get_event_by_id(req.event_id)
    if not event:
        raise Exception("Event not found")
        
    # Capacity check
    total = event.get("total_tickets", 100)
    sold = event.get("tickets_sold", 0)
    
    if sold + req.quantity > total:
        raise Exception("Not enough tickets available")

    # 2. Check promo code (optional)
    promo_id = None
    if req.promo_code:
        res = admin_client.table("promo_codes").select("*").eq("code", req.promo_code).eq("active", True).execute()
        if res.data:
            promo_id = res.data[0]["id"]
            # To-do: apply discount logic to price
        else:
            raise Exception("Invalid or expired promo code")

    # 3. Create reservation in "In Process" (15 minute window)
    expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    res_data = {
        "user_id": user_id,
        "event_id": str(req.event_id),
        "quantity": req.quantity,
        "status": "In Process",
        "promo_code_id": promo_id,
        "expires_at": expires_at
    }
    
    response = admin_client.table("ticket_reservations").insert(res_data).execute()
    if not response.data:
        raise Exception("Failed to create reservation")
        
    return response.data[0]


async def purchase_tickets(user_id: str, reservation_id: str) -> List[Dict[str, Any]]:
    """Finalize purchase and generate secure tickets."""
    # 1. Validate reservation
    res = admin_client.table("ticket_reservations").select("*").eq("id", reservation_id).eq("user_id", user_id).execute()
    if not res.data:
        raise Exception("Reservation not found")
        
    reservation = res.data[0]
    if reservation["status"] == "Done/Confirmated":
        raise Exception("Tickets already purchased")
        
    # Check expiry (Supabase storage uses ISO format)
    expires_at_str = reservation["expires_at"].replace('Z', '+00:00')
    expires_at = datetime.fromisoformat(expires_at_str)
    if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
        raise Exception("Reservation expired. Please start over.")

    # 2. Generate UNIQUE Tickets
    tickets_to_insert = []
    for _ in range(reservation["quantity"]):
        # Secure unique identifiers
        qr_token = secrets.token_urlsafe(32)
        text_code = "".join(secrets.choice("ABCDEFGHIJKLMNPQRSTUVWXYZ123456789") for _ in range(8))
        
        ticket_data = {
            "reservation_id": reservation_id,
            "user_id": user_id,
            "event_id": reservation["event_id"],
            "qr_code_token": qr_token,
            "text_code": text_code
        }
        tickets_to_insert.append(ticket_data)
    
    # Bulk insert tickets
    t_res = admin_client.table("tickets").insert(tickets_to_insert).execute()
    if not t_res.data:
        raise Exception("Failed to generate tickets")
    
    # 3. Update reservation status
    admin_client.table("ticket_reservations").update({"status": "Done/Confirmated"}).eq("id", reservation_id).execute()
    
    # 4. Update Event stats
    event_id = reservation["event_id"]
    event = await supabase_service.get_event_by_id(UUID(event_id))
    new_sold = event.get("tickets_sold", 0) + reservation["quantity"]
    await supabase_service.update_event(UUID(event_id), {"tickets_sold": new_sold})
    
    # 5. Passport: Add experience stamp ONLY if the user has never attended this specific event.
    # Logic: one stamp per unique (user_id, event_id) — buying more tickets for the same event does NOT count again.
    existing_stamp = admin_client.table("experience_stamps") \
        .select("id") \
        .eq("user_id", user_id) \
        .eq("event_id", event_id) \
        .execute()
    
    if not existing_stamp.data:
        stamp_data = {
            "user_id": user_id,
            "store_id": event["owner_id"],
            "event_id": event_id
        }
        admin_client.table("experience_stamps").insert(stamp_data).execute()
    
    # 6. Create Notification for the venue owner
    await create_notification(
        user_id=event["owner_id"],
        ntype="booking",
        title="New Ticket Sold! 🎟️",
        message=f"A customer just bought {reservation['quantity']} ticket(s) for '{event['title']}'.",
        link=f"/business/analytics/events?event_id={event_id}"
    )
    
    return t_res.data


async def validate_ticket(staff_user_id: str, req: Any) -> Dict[str, Any]:
    """Validate a ticket's authenticity and ownership."""
    # 1. Find ticket
    client = supabase_admin if supabase_admin else supabase
    query = client.table("tickets").select("*, events(owner_id)")
    if req.qr_code_token:
        query = query.eq("qr_code_token", req.qr_code_token)
    elif req.text_code:
        query = query.eq("text_code", req.text_code)
    else:
        raise Exception("Provide a QR code or Text code")
        
    res = query.execute()
    if not res.data:
        raise Exception("Invalid ticket: QR or code not found")
        
    ticket = res.data[0]
    
    # 2. Authorization Check (Owner or Team Member)
    owner_id = ticket["events"]["owner_id"]
    if owner_id != staff_user_id:
        # Check team_members table
        team_check = client.table("team_members").select("*").eq("store_id", owner_id).eq("user_id", staff_user_id).eq("accepted", True).execute()
        if not team_check.data:
            raise Exception("You do not have permission to validate tickets for this store")

    # 3. Status Check
    if ticket["attended"]:
        raise Exception("Ticket already redeemed!")
        
    # 4. Success - Mark as used
    admin_client.table("tickets").update({"attended": True}).eq("id", ticket["id"]).execute()
    
    # 5. Fetch User Profile for feedback (only full_name, no email)
    user_res = client.table("profiles").select("full_name").eq("id", ticket["user_id"]).execute()
    user_info = user_res.data[0] if user_res.data else {"full_name": "Unknown"}
    
    return {
        "status": "success", 
        "message": "Validated! Welcome to the event.",
        "ticket_id": ticket["id"],
        "user_name": user_info.get("full_name", "Unknown"),
        "user_email": "",  # Email not available
        "text_code": ticket["text_code"]
    }


async def get_event_attendees(owner_id: str, event_id: str) -> List[Dict[str, Any]]:
    """Get list of all tickets/attendees for a specific event."""
    # Security: Verify ownership
    event = await supabase_service.get_event_by_id(UUID(event_id))
    if not event or str(event["owner_id"]) != str(owner_id):
        raise Exception("Access denied: You do not own this event")

    client = supabase_admin if supabase_admin else supabase
    
    # First, try to get tickets with profile join
    # If that fails, fall back to getting tickets only and fetching profiles separately
    try:
        res = client.table("tickets").select("*, profiles(full_name)").eq("event_id", event_id).execute()
    except Exception as e:
        print(f"Join failed, using fallback: {e}")
        # Fallback: get tickets without join
        res = client.table("tickets").select("*").eq("event_id", event_id).execute()
    
    # Flatten structure
    attendees = []
    for t in res.data:
        # Try to get profile data from join, or fall back to fetching separately
        profile = t.get("profiles", {})
        
        # If no profile from join, fetch it manually
        if not profile and t.get("user_id"):
            try:
                profile_res = client.table("profiles").select("full_name").eq("id", t["user_id"]).execute()
                if profile_res.data:
                    profile = profile_res.data[0]
            except:
                profile = {}
        
        attendees.append({
            "ticket_id": t["id"],
            "user_name": profile.get("full_name", "Anonymous"),
            "user_email": "",  # Email not available in profiles table
            "text_code": t["text_code"],
            "attended": t["attended"],
            "created_at": t["created_at"]
        })
    return attendees


async def get_event_ticketing_stats(owner_id: str, event_id: str) -> Dict[str, Any]:
    """Get summarized ticketing stats for an event."""
    # Security: Verify ownership
    event = await supabase_service.get_event_by_id(UUID(event_id))
    if not event or str(event["owner_id"]) != str(owner_id):
        raise Exception("Access denied: You do not own this event")

    # Fetch total capacity from event
    total_capacity = event.get("total_tickets", 0)
    manual_sold = event.get("manual_tickets_sold", 0) or 0
    view_count = event.get("view_count", 0) or 0
    
    # Count tickets
    tickets_res = admin_client.table("tickets").select("attended").eq("event_id", event_id).execute()
    tickets = tickets_res.data or []
    
    # Total sold = DB tickets + manual entries
    sold = len(tickets) + manual_sold
    attended = sum(1 for t in tickets if t["attended"])
    
    return {
        "total_capacity": total_capacity,
        "tickets_sold": sold,
        "manual_tickets_sold": manual_sold,
        "attended_count": attended,
        "view_count": view_count,
        "remaining_capacity": total_capacity - sold,
        # Attendance rate is only based on digital tickets or we can ignore it as user requested deletion of card
        "attendance_rate": (attended / sold * 100) if sold > 0 else 0
    }


async def get_user_tickets(user_id: str) -> List[Dict[str, Any]]:
    """Return all tickets belonging to a user with event details."""
    res = admin_client.table("tickets").select("*, events(title, event_date, location_address, image_url)").eq("user_id", user_id).execute()
    return res.data


async def get_tickets_grouped_by_event(user_id: str) -> List[Dict[str, Any]]:
    """Group tickets by event for a high-level view."""
    tickets = await get_user_tickets(user_id)
    
    events_map = {}
    for t in tickets:
        eid = t["event_id"]
        if eid not in events_map:
            events_map[eid] = {
                "event_id": eid,
                "details": t["events"],
                "tickets": []
            }
        # Clean up 'events' from the ticket object to avoid redundancy
        t_copy = t.copy()
        if "events" in t_copy:
            del t_copy["events"]
        events_map[eid]["tickets"].append(t_copy)
        
    return list(events_map.values())


async def get_reservation(reservation_id: str) -> Dict[str, Any]:
    """Fetch reservation details by ID."""
    res = admin_client.table("ticket_reservations").select("*").eq("id", reservation_id).execute()
    if not res.data:
        raise Exception("Reservation not found")
    return res.data[0]
