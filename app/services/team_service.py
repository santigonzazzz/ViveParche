"""
Team Service for VibeMap AI.
Handles team member invitations, role management, and venue linkage.
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
from app.services import auth_service

async def get_venue_by_owner(owner_id: str) -> Optional[Dict[str, Any]]:
    """Get the venue owned by a specific user."""
    try:
        response = supabase_admin.table("venues").select("*").eq("owner_id", owner_id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        raise Exception(f"Error fetching venue for owner: {str(e)}")

async def invite_worker(owner_id: str, email: str, full_name: str, password: Optional[str] = None) -> Dict[str, Any]:
    """
    Invite a worker to a venue.
    This creates a profile with role 'worker' and links it to the owner's venue.
    If the user already exists, it updates their role and links them.
    Plan limits enforced server-side:
      - FREE / VITRINA  → 0 workers
      - ARRANQUE        → 1 worker
      - EL PARCHE       → 3 workers
      - PRO             → unlimited
    """
    try:
        # 1. Get owner's venue
        venue = await get_venue_by_owner(owner_id)
        if not venue:
            raise Exception("No venue found for this owner. Please complete onboarding first.")

        # 2. Plan-based worker limit enforcement
        subscription_tier = (venue.get("subscription_tier") or "FREE").upper()
        PLAN_LIMITS = {
            "FREE": 0,
            "VITRINA": 0,
            "ARRANQUE": 1,
            "EL PARCHE": 3,
            # PRO and any unknown tier = unlimited (-1)
        }
        max_workers = PLAN_LIMITS.get(subscription_tier, -1)  # -1 means unlimited

        if max_workers == 0:
            raise Exception(
                "Tu plan actual no permite agregar meseros. "
                "Actualiza a 'Arranque' para agregar 1 mesero, 'El Parche' para hasta 3, "
                "o 'PRO' para ilimitados."
            )

        if max_workers > 0:
            # Count current workers for this venue
            current_workers_res = supabase_admin.table("venue_team") \
                .select("id", count="exact") \
                .eq("venue_id", venue["id"]) \
                .execute()
            current_count = current_workers_res.count or 0
            if current_count >= max_workers:
                raise Exception(
                    f"Has alcanzado el límite de {max_workers} mesero(s) para tu plan '{subscription_tier}'. "
                    f"Mejora tu plan para agregar más."
                )
        
        # 2. Register/Find worker
        worker_id = None
        final_password = password
        
        # Check if user already exists via admin client to bypass some RLS/filters
        existing_profile = supabase_admin.table("profiles").select("id").eq("full_name", full_name).execute()
        # Note: Above doesn't check email. Let's try auth find.
        # Supabase doesn't have a simple "find by email" in the client for non-authed.
        # We'll use the register_user try/catch logic which already handles this.
        
        import secrets
        import string
        if not final_password:
            final_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        try:
            reg_res = await auth_service.register_user(
                email=email, 
                password=final_password, 
                full_name=full_name, 
                role="worker"
            )
            worker_id = reg_res.get("user_id")
        except Exception as e:
            if "already registered" in str(e).lower():
                # If already registered, we need to get their ID and update role
                # We can't get ID easily without admin auth list or profile search
                # Try finding in profiles table (assuming name/email match or just fallback)
                profile = supabase_admin.table("profiles").select("id").eq("full_name", full_name).execute()
                if profile.data:
                    worker_id = profile.data[0]["id"]
                    # Update role to worker if they were just a 'user'
                    supabase_admin.table("profiles").update({"role": "worker"}).eq("id", worker_id).execute()
                else:
                    raise Exception(f"User with this email exists but profile not found. Error: {str(e)}")
            else:
                raise e
        
        if not worker_id:
            raise Exception("Could not determine worker ID.")

        # 3. Link worker to venue in venue_team table
        team_data = {
            "venue_id": venue["id"],
            "member_id": worker_id,
            "role": "worker"
        }
        
        # Use upsert to avoid duplicate errors if they were already invited
        supabase_admin.table("venue_team").upsert(team_data).execute()
        
        return {
            "message": f"Worker {full_name} invited successfully.",
            "email": email,
            "worker_id": worker_id,
            "temp_password": final_password if password else "Already exists or generated"
        }
    except Exception as e:
        raise Exception(f"Error inviting worker: {str(e)}")

async def get_team_members(owner_id: str) -> List[Dict[str, Any]]:
    """List all team members for the owner's venue."""
    try:
        venue = await get_venue_by_owner(owner_id)
        if not venue:
            return []
            
        # Get team linkings
        team_response = supabase_admin.table("venue_team").select("*").eq("venue_id", venue["id"]).execute()
        if not team_response.data:
            return []
            
        member_ids = [str(m["member_id"]) for m in team_response.data]
        
        # Fetch profiles for these members
        profiles_response = supabase_admin.table("profiles").select("*").in_("id", member_ids).execute()
        
        # Merge data
        members_map = {str(m["member_id"]): m for m in team_response.data}
        result = []
        for p in profiles_response.data:
            pid = str(p["id"])
            result.append({
                **p,
                "team_role": members_map[pid]["role"],
                "joined_at": members_map[pid]["created_at"]
            })
            
        return result
    except Exception as e:
        raise Exception(f"Error fetching team members: {str(e)}")

async def remove_team_member(owner_id: str, member_id: str) -> bool:
    """Remove a worker from the owner's venue team and delete their account."""
    try:
        venue = await get_venue_by_owner(owner_id)
        if not venue:
            raise Exception("Venue not found")
            
        # 1. Remove from venue_team link
        supabase_admin.table("venue_team").delete().eq("venue_id", venue["id"]).eq("member_id", member_id).execute()
        
        # 2. Permanently delete the user account (Profile + Auth)
        # This allows the email to be reused for fresh invitations
        await auth_service.delete_user_account(member_id)
        
        return True
    except Exception as e:
        raise Exception(f"Error removing team member: {str(e)}")

async def update_team_member(owner_id: str, member_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update worker information (name/password)."""
    try:
        venue = await get_venue_by_owner(owner_id)
        if not venue:
            raise Exception("Venue not found")
            
        # Verify member belongs to this venue
        check = supabase_admin.table("venue_team").select("*").eq("venue_id", venue["id"]).eq("member_id", member_id).execute()
        if not check.data:
            raise Exception("Member not found in your team")
            
        # Update Profiles table
        profile_updates = {}
        if "full_name" in update_data:
            profile_updates["full_name"] = update_data["full_name"]
            supabase_admin.table("profiles").update(profile_updates).eq("id", member_id).execute()
            
        # Update Auth password if provided
        if "password" in update_data and update_data["password"]:
            from app.services.auth_service import update_user_password
            await update_user_password(member_id, update_data["password"])
            
        return {"success": True, "message": "Team member updated successfully"}
    except Exception as e:
        raise Exception(f"Error updating team member: {str(e)}")
