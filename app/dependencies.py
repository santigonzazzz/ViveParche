"""
Dependencies for VibeMap AI API.
Includes auth validation.
"""

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from app.config import settings
from app.services.supabase_service import supabase_admin as admin_client

security = HTTPBearer()

# Simple in-memory cache for roles to speed up dashboard requests
# Format: {user_id: {"role": "owner", "expires": datetime}}
ROLE_CACHE = {}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validate the Supabase JWT and return user info.
    """
    token = credentials.credentials
    try:
        user = admin_client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        user_id = user.user.id
        now = datetime.utcnow()
        
        # FORCE CACHE CLEAR FOR DEBUGGING
        if user_id in ROLE_CACHE:
            del ROLE_CACHE[user_id]
            
        # Fetch role from profiles table (more accurate than user_metadata)
        try:
            # Use admin client if available to bypass RLS, otherwise use standard client
            db_client = admin_client if admin_client else supabase
            
            # Fetch full profile to ensure hash and QR are available
            profile = db_client.table("profiles").select("*").eq("id", user_id).execute()
            
            from app.utils.crypto import generate_user_hash, generate_qr_payload
            
            if profile.data:
                profile_record = profile.data[0]
                role = profile_record.get("role", "customer")
                notification_settings = profile_record.get("notification_settings", {})
                
                # SELF-HEALING: If hash or QR are missing, generate and update
                updated_data = {}
                if not profile_record.get("user_hash_id"):
                    profile_record["user_hash_id"] = generate_user_hash(user_id)
                    updated_data["user_hash_id"] = profile_record["user_hash_id"]
                    print(f"DEBUG - Generated missing hash_id for {user_id}: {profile_record['user_hash_id']}")
                
                if not profile_record.get("qr_payload") or profile_record.get("qr_payload") == "PARCHE:PENDING":
                    profile_record["qr_payload"] = generate_qr_payload(user_id, profile_record["user_hash_id"])
                    updated_data["qr_payload"] = profile_record["qr_payload"]
                    print(f"DEBUG - Generated missing qr_payload for {user_id}")
                
                if updated_data:
                    db_client.table("profiles").update(updated_data).eq("id", user_id).execute()
                
                # Ensure name is loaded if missing (rare but possible)
                if not profile_record.get("full_name") or profile_record.get("full_name") == "User":
                    meta = user.user.user_metadata or {}
                    # Google name mapping: 'full_name' or 'name'
                    google_name = meta.get("full_name") or meta.get("name")
                    if google_name:
                        profile_record["full_name"] = google_name
                        db_client.table("profiles").update({"full_name": google_name}).eq("id", user_id).execute()
            else:
                # User exists in Auth but not in Profiles (OAuth new user or missing profile)
                meta = user.user.user_metadata or {}
                role = meta.get("role", "customer")
                
                # Better name extraction for OAuth
                email = user.user.email or ""
                # Priority: Google full_name > Google name > Email prefix
                full_name = meta.get("full_name") or meta.get("name") or (email.split("@")[0] if email else "User")
                
                hash_id = generate_user_hash(user_id)
                qr_payload = generate_qr_payload(user_id, hash_id)
                
                profile_record = {
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "role": role,
                    "user_hash_id": hash_id,
                    "qr_payload": qr_payload,
                    "notification_settings": {}
                }
                
                print(f"DEBUG - Creating missing profile for {email} ({user_id})")
                db_client.table("profiles").insert(profile_record).execute()
            
            # Return complete profile data
            return {
                "id": user_id,
                "email": user.user.email,
                "full_name": profile_record.get("full_name", "User"),
                "role": profile_record.get("role", "customer"),
                "user_hash_id": profile_record.get("user_hash_id"),
                "qr_payload": profile_record.get("qr_payload"),
                "notification_settings": profile_record.get("notification_settings", {}),
                "avatar_url": profile_record.get("avatar_url"),
                "vibecoins": profile_record.get("vibecoins", 0)
            }
        except Exception as e:
            # Fallback to user_metadata if profiles query fails
            print(f"CRITICAL AUTH ERROR: {str(e)}", flush=True)
            import traceback
            traceback.print_exc()
            role = user.user.user_metadata.get("role", "customer")
            return {
                "id": user_id,
                "email": user.user.email,
                "full_name": user.user.user_metadata.get("full_name") or user.user.user_metadata.get("name") or "User",
                "role": role,
                "notification_settings": {}
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )


def require_role(role: str):
    """
    Dependency to require a specific role.
    Note: Roles should be checked against the 'profiles' table for accuracy.
    """
    async def role_checker(current_user=Depends(get_current_user)):
        # We trust get_current_user has already fetched the correct role
        if current_user["role"] != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires {role} role"
            )
        return current_user
    return role_checker
