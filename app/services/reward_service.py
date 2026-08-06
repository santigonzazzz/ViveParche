"""
Reward and Loyalty service for VibeMap AI.
Handles Passport stamps, threshold checking, and coupon generation.
"""

import os
import secrets
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.services.supabase_service import supabase_admin as admin_client


async def get_user_stamps(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve all stamps for the user."""
    res = admin_client.table("experience_stamps").select("*, profiles!store_id(full_name)").eq("user_id", user_id).execute()
    return res.data


async def get_stamp_count(user_id: str, store_id: str) -> Dict[str, Any]:
    """Check how many stamps a user has for a specific store."""
    res = admin_client.table("experience_stamps").select("count").eq("user_id", user_id).eq("store_id", store_id).execute()
    
    # Threshold check
    config = admin_client.table("store_config").select("stamp_limit").eq("store_id", store_id).execute()
    limit = config.data[0]["stamp_limit"] if config.data else 5
    
    count = res.data[0]["count"] if res.data else 0
    return {
        "count": count,
        "limit": limit,
        "progress": (count / limit) * 100 if limit > 0 else 0
    }


async def claim_reward(user_id: str, store_id: str) -> Dict[str, Any]:
    """Convert stamps into a coupon if limit reached."""
    # 1. Check stamps
    stamps_res = admin_client.table("experience_stamps").select("*").eq("user_id", user_id).eq("store_id", store_id).execute()
    stamps = stamps_res.data or []
    
    # 2. Get limit
    config_res = admin_client.table("store_config").select("stamp_limit").eq("store_id", store_id).execute()
    limit = config_res.data[0]["stamp_limit"] if config_res.data else 5
    
    if len(stamps) < limit:
        raise Exception(f"Not enough stamps! You need {limit} stamps to claim a reward.")

    # 3. Generate Secure Unique Coupon
    qr_token = secrets.token_urlsafe(32)
    text_code = "".join(secrets.choice("ABCDEFGHIJKLMNPQRSTUVWXYZ123456789") for _ in range(10))
    
    reward_data = {
        "user_id": user_id,
        "store_id": store_id,
        "reward_type": "Loyalty Reward Coupon",
        "qr_code_token": qr_token,
        "text_code": text_code,
        "claimed_at": datetime.utcnow().isoformat()
    }
    
    res = admin_client.table("rewards").insert(reward_data).execute()
    if not res.data:
        raise Exception("Failed to generate reward coupon")
        
    # 4. Burn the used stamps
    used_ids = [s["id"] for s in stamps[:limit]]
    admin_client.table("experience_stamps").delete().in_("id", used_ids).execute()
    
    return res.data[0]


async def validate_reward(staff_user_id: str, req: Any) -> Dict[str, Any]:
    """Business validation of a reward coupon."""
    # 1. Find reward
    query = admin_client.table("rewards").select("*")
    if req.qr_code_token:
        query = query.eq("qr_code_token", req.qr_code_token)
    elif req.text_code:
        query = query.eq("text_code", req.text_code)
    else:
        raise Exception("Provide a QR code or Text code")
        
    res = query.execute()
    if not res.data:
        raise Exception("Invalid reward coupon")
        
    reward = res.data[0]
    
    # 2. Authorization (Must be store owner or staff)
    store_id = reward["store_id"]
    if store_id != staff_user_id:
        team_check = admin_client.table("team_members").select("*").eq("store_id", store_id).eq("user_id", staff_user_id).eq("accepted", True).execute()
        if not team_check.data:
            raise Exception("Unauthorized to validate rewards for this store")
            
    # 3. Status check
    if reward.get("used_at"):
        raise Exception("Coupon already used!")
        
    # 4. Finalize
    admin_client.table("rewards").update({"used_at": datetime.utcnow().isoformat()}).eq("id", reward["id"]).execute()
    
    return {
        "status": "success",
        "message": "Reward claimed successfully!",
        "reward_type": reward["reward_type"]
    }


async def get_passport_summary(user_id: str) -> Dict[str, Any]:
    """Get aggregated progress for stamps, coins, and available coupons."""
    from app.services.supabase_service import supabase_admin as admin_client_admin, supabase
    client = supabase_admin if supabase_admin else supabase
    # 0. Get user profile for coins and hash_id
    profile_res = client.table("profiles").select("vibecoins, user_hash_id, full_name").eq("id", user_id).single().execute()
    profile_data = profile_res.data or {}

    # 1. Get all event stamps (experience_stamps table) - legacy
    stamps_res = client.table("experience_stamps").select("*, profiles!store_id(full_name)").eq("user_id", user_id).execute()
    event_stamps_raw = stamps_res.data or []
    
    # Group by store
    store_progress = {}
    for s in event_stamps_raw:
        sid = s["store_id"]
        sname = s.get("profiles", {}).get("full_name", "Unknown Venue")
        if sid not in store_progress:
            config = client.table("store_config").select("stamp_limit").eq("store_id", sid).execute()
            limit = config.data[0]["stamp_limit"] if config.data else 5
            store_progress[sid] = {
                "store_id": sid,
                "store_name": sname,
                "stamps_count": 0,
                "limit": limit
            }
        store_progress[sid]["stamps_count"] += 1

    # 2. Get active (unused) rewards
    rewards_res = client.table("rewards").select("*, profiles!store_id(full_name)").eq("user_id", user_id).is_("used_at", "null").execute()
    coupons = rewards_res.data or []

    # 3. Get venue-specific stamps (venue_loyalty table) with enriched reward info
    venue_loyalty_res = client.table("venue_loyalty").select("*, venues(name, id)").eq("user_id", user_id).execute()
    venue_stamps = []
    
    if venue_loyalty_res.data:
        # Collect all venue_ids to batch-fetch active stamp rewards
        venue_ids = [v["venue_id"] for v in venue_loyalty_res.data]
        active_rewards_res = client.table("stamp_rewards").select("id, venue_id, title, stamps_required, description").eq("active", True).in_("venue_id", venue_ids).execute()
        
        # Build a map: venue_id -> active reward
        active_rewards_map: Dict[str, Any] = {}
        for r in (active_rewards_res.data or []):
            active_rewards_map[r["venue_id"]] = r

        for v in venue_loyalty_res.data:
            v_info = v.get("venues") or {}
            venue_id = v["venue_id"]
            stamps_count = v.get("stamps_count", 0)
            
            # Fetch all active milestones for this venue
            milestones_res = client.table("stamp_rewards") \
                .select("id, stamps_required, title, description") \
                .eq("venue_id", venue_id) \
                .eq("active", True) \
                .order("stamps_required", desc=False) \
                .execute()
            
            milestones = milestones_res.data or []
            
            # Get all tickets from both tables (legacy reward_tickets and newer passport_rewards)
            venue_tickets_res = client.table("reward_tickets") \
                .select("id, status, perk_id, venue_perks(title)") \
                .eq("user_id", user_id) \
                .eq("venue_id", venue_id) \
                .execute()
            
            passport_claims_res = client.table("passport_rewards") \
                .select("id, status, stamp_reward_id, stamp_rewards(title)") \
                .eq("user_id", user_id) \
                .eq("venue_id", venue_id) \
                .execute()
            
            all_venue_tickets = venue_tickets_res.data or []
            all_passport_claims = passport_claims_res.data or []

            # Combine titles of ACTIVE tickets
            active_ticket_titles = []
            for t in all_venue_tickets:
                if t["status"] == "ACTIVE":
                    active_ticket_titles.append((t.get("venue_perks") or {}).get("title", "").lower())
            for t in all_passport_claims:
                if t["status"] == "ACTIVE":
                    active_ticket_titles.append((t.get("stamp_rewards") or {}).get("title", "").lower())
            
            # Combine titles of ALL tickets (claimed/active)
            claimed_titles = []
            for t in all_venue_tickets:
                claimed_titles.append((t.get("venue_perks") or {}).get("title", "").lower())
            for t in all_passport_claims:
                claimed_titles.append((t.get("stamp_rewards") or {}).get("title", "").lower())

            active_ticket_titles = [x for x in active_ticket_titles if x]
            claimed_titles = [x for x in claimed_titles if x]

            # Identify next reward and previous milestone
            # A milestone is "next" if:
            # 1. It is reached (stamps_required <= stamps_count) but NOT yet redeemed
            # 2. It is NOT yet reached (stamps_required > stamps_count)
            
            # 1. Check for reached but not fully redeemed rewards
            # We consider a milestone "unclaimed" if it's reached AND its title (fuzzy) is in active_ticket_perk_titles
            # OR if it's reached AND its title is NOT IN claimed_perk_titles (needs issuance)
            
            reached_unclaimed = None
            for m in milestones:
                if m["stamps_required"] <= stamps_count:
                    m_title = m["title"].lower().strip()
                    # Is it already issued/active?
                    is_active = any(m_title in t_title or t_title in m_title for t_title in active_ticket_titles)
                    # Is it already claimed/redeemed?
                    is_claimed = any(m_title in t_title or t_title in m_title for t_title in claimed_titles)
                    
                    if is_active or not is_claimed:
                        reached_unclaimed = m
                        break
            
            if reached_unclaimed:
                next_m = reached_unclaimed
                progress_pct = 100.0
            else:
                # No reached unclaimed rewards, find the absolute next one
                next_m = next((m for m in milestones if m["stamps_required"] > stamps_count), None)
                
                if next_m:
                    goal = next_m["stamps_required"]
                    progress_pct = (stamps_count / goal) * 100 if goal > 0 else 0
                else:
                    progress_pct = 100 if milestones else 0
                    next_m = milestones[-1] if milestones else {"title": "¡Máximo nivel alcanzado!", "stamps_required": stamps_count}
            
            venue_stamps.append({
                "venue_id": venue_id,
                "venue_name": v_info.get("name", "Unknown Venue"),
                "venue_slug": v_info.get("slug"),
                "total_actual": stamps_count,
                "siguiente_recompensa": next_m,
                "porcentaje_progreso": round(progress_pct, 2),
                "recompensas_disponibles": [r["id"] for r in all_venue_tickets if r["status"] == "ACTIVE"] + [r["id"] for r in all_passport_claims if r["status"] == "ACTIVE"],
                "last_visit": v.get("last_visit"),
                # Keep legacy fields for compatibility
                "stamps_count": stamps_count,
                "limit": next_m.get("stamps_required", 5)
            })

    total_stamps = 0
    for v_entry in venue_stamps:
        val = v_entry.get("total_actual", 0)
        if isinstance(val, (int, float)):
            total_stamps += int(val)
    for s_entry in store_progress.values():
        val = s_entry.get("stamps_count", 0)
        if isinstance(val, (int, float)):
            total_stamps += int(val)

    level = 1
    badge = None
    if total_stamps > 10:
        level = 2
        badge = "Paisa Pro"

    return {
        "user_hash_id": profile_data.get("user_hash_id"),
        "vibecoins": profile_data.get("vibecoins", 0),
        "event_stamps": list(store_progress.values()),
        "venue_stamps": venue_stamps,
        "coupons": coupons,
        "total_stamps": total_stamps,
        "level": level,
        "badge": badge
    }
