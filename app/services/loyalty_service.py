from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
from app.services.settings_service import create_notification

async def validate_visit(user_hash_id: str, venue_id: str, staff_id: str, amount_spent: Optional[float] = None, user_lat: Optional[float] = None, user_lng: Optional[float] = None):
    """
    Validate a user's visit to a venue and grant a stamp + coins.
    """
    # 1. Fetch user by hash_id
    user_res = supabase_admin.table("profiles").select("id, full_name, vibecoins").eq("user_hash_id", user_hash_id).execute()
    if not user_res.data:
        raise Exception("User not found with this code.")
    
    user_profile = user_res.data[0]
    user_id = user_profile["id"]

    # 2. Anti-Fraud: Check if user already got a stamp in the last 6 hours at this venue
    last_visit_res = supabase_admin.table("visit_log") \
        .select("created_at") \
        .eq("user_id", user_id) \
        .eq("venue_id", venue_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if last_visit_res.data:
        last_time = datetime.fromisoformat(last_visit_res.data[0]["created_at"].replace('Z', '+00:00'))
        if datetime.now().replace(tzinfo=last_time.tzinfo) - last_time < timedelta(hours=6):
            raise Exception("Too soon! A user can only get 1 stamp per venue every 6 hours.")

    # 3. Log the visit
    supabase_admin.table("visit_log").insert({
        "user_id": user_id,
        "venue_id": venue_id,
        "staff_id": staff_id,
        "amount_spent": amount_spent or 0
    }).execute()

    # 4. Update Loyalty Progress (Stamps) - CUMULATIVE MILESTONE LOGIC
    loyalty_res = supabase_admin.table("venue_loyalty").select("*").eq("user_id", user_id).eq("venue_id", venue_id).execute()
    
    if not loyalty_res.data:
        # First visit — create the cumulative loyalty record
        stamps = 1
        supabase_admin.table("venue_loyalty").insert({
            "user_id": user_id,
            "venue_id": venue_id,
            "stamps_count": stamps,
            "last_visit": datetime.utcnow().isoformat()
        }).execute()
        loyalty_record = {"stamps_count": 1} # Mock for logic below
    else:
        record = loyalty_res.data[0]
        stamps = record["stamps_count"] + 1
        loyalty_record = record
        
        # Update cumulative internal count
        supabase_admin.table("venue_loyalty").update({
            "stamps_count": stamps,
            "last_visit": datetime.utcnow().isoformat()
        }).eq("id", record["id"]).execute()

    # 4b. Milestone Unlocking Logic
    # Fetch all active stamp rewards for this venue, ordered by stamps_required
    milestones_res = supabase_admin.table("stamp_rewards") \
        .select("id, stamps_required, title") \
        .eq("venue_id", venue_id) \
        .eq("active", True) \
        .order("stamps_required", desc=False) \
        .execute()
    
    milestones = milestones_res.data or []
    
    # Fetch already claimed milestones (reward_tickets) for this user/venue
    # We identify them by linking to venue_perks that are associated with these milestones
    # Note: In the current schema, we might need a way to link stamp_rewards to venue_perks.
    # If they aren't directly linked, we'll use the title or a convention.
    # For now, let's assume we can fetch active perks and check which ones the user already has.
    
    claimed_tickets_res = supabase_admin.table("reward_tickets") \
        .select("perk_id") \
        .eq("user_id", user_id) \
        .eq("venue_id", venue_id) \
        .execute()
    claimed_perk_ids = [t["perk_id"] for t in (claimed_tickets_res.data or [])]

    # Fetch active venue_perks to see which ones correspond to our milestones
    # Convention: If a stamp_reward exists, it should have a corresponding perk.
    # For this implementation, we will check if a ticket for the specific perk exists.
    # We need to find the perk_id for each milestone. 
    # Current code uses 'active_perk' for the single reward. We'll extend this.
    
    import uuid, string, random
    tickets_created = []

    # CUMULATIVE MILESTONE LOGIC
    # Fetch all active perks for this venue once to avoid repeated queries in the loop
    active_perks_res = supabase_admin.table("venue_perks") \
        .select("id, title") \
        .eq("venue_id", venue_id) \
        .eq("active", True) \
        .execute()
    active_perks = active_perks_res.data or []

    for m in milestones:
        required = m.get("stamps_required", 5)
        m_title_clean = m["title"].strip().lower()
        
        if stamps >= required:
            # TRY ROBUST MATCHING:
            # 1. Exact match
            target_perk = next((p for p in active_perks if p["title"].strip().lower() == m_title_clean), None)
            
            # 2. Fuzzy match (if title contains or is contained in)
            if not target_perk:
                target_perk = next((p for p in active_perks if m_title_clean in p["title"].lower() or p["title"].lower() in m_title_clean), None)
            
            # 3. Last resort: Take the first available perk if there's only one and names are vaguely related
            if not target_perk and len(active_perks) == 1:
                target_perk = active_perks[0]

            if target_perk:
                if target_perk["id"] not in claimed_perk_ids:
                    qr_token = str(uuid.uuid4())
                    text_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                    
                    supabase_admin.table("reward_tickets").insert({
                        "user_id": user_id, 
                        "venue_id": venue_id, 
                        "status": "ACTIVE",
                        "qr_token": qr_token, 
                        "text_code": text_code,
                        "perk_id": target_perk["id"],
                        "total_coins_spent": 0
                    }).execute()
                    
                    print(f"DEBUG: Issued ticket for milestone '{m['title']}' using perk '{target_perk['title']}'")
                    tickets_created.append(m['title'])
                    claimed_perk_ids.append(target_perk["id"])
                else:
                    print(f"DEBUG: Milestone '{m['title']}' already claimed (perk_id: {target_perk['id']})")
            else:
                print(f"WARNING: Could not find matching perk for milestone '{m['title']}' at venue {venue_id}")

    # 5. Grant VibeCoins (50 base + 1% bonus, capped at 1500)
    base_coins = 50
    bonus_coins = int((amount_spent or 0) * 0.01)
    total_awarded = min(base_coins + bonus_coins, 1500) # Fixed coin inflation cap
    
    new_coins = user_profile.get("vibecoins", 0) + total_awarded
    
    # Update profile balance
    supabase_admin.table("profiles").update({"vibecoins": new_coins}).eq("id", user_id).execute()
    
    # Log transactions
    transactions = [
        {"user_id": user_id, "amount": base_coins, "type": "base", "venue_id": venue_id}
    ]
    if bonus_coins > 0:
        actual_bonus = total_awarded - base_coins
        if actual_bonus > 0:
            transactions.append({"user_id": user_id, "amount": actual_bonus, "type": "bonus", "venue_id": venue_id})
            
    supabase_admin.table("coin_transactions").insert(transactions).execute()

    # Determine next milestone for the response
    next_milestone = next((m for m in milestones if m["stamps_required"] > stamps), None)
    stamp_limit = next_milestone["stamps_required"] if next_milestone else (milestones[-1]["stamps_required"] if milestones else 5)

    return {
        "status": "success",
        "user_name": user_profile["full_name"],
        "stamps": stamps,
        "coins_awarded": total_awarded,
        "total_coins": new_coins,
        "stamp_limit": stamp_limit,
        "tickets_unlocked": tickets_created,
        "next_reward": next_milestone["title"] if next_milestone else "¡Máximo nivel alcanzado!"
    }


async def _get_venue_owner(venue_id: str):
    res = supabase_admin.table("venues").select("owner_id").eq("id", venue_id).single().execute()
    return res.data["owner_id"] if res.data else None
