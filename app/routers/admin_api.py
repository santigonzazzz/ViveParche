"""
Secure Admin API Router.
All endpoints require the 'admin' role.
Uses obfuscated prefix to reduce attack surface.
SQL injection protected via Supabase's parameterized PostgREST queries.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, validator
from typing import Optional
from app.dependencies import get_current_user, require_role
from app.services.supabase_service import supabase_admin as admin_client
from app.services.email_service import (
    send_subscription_approved_email,
    send_subscription_rejected_email,
    send_subscription_expired_email,
)
from app.config import settings
from datetime import datetime, timedelta
import asyncio
import re

# Obfuscated prefix - not /admin
router = APIRouter(prefix="/x-mgmt", tags=["Admin"])

# --- Security helpers ---

def _get_admin_db():
    """Always use the admin client for admin operations to bypass RLS."""
    if not admin_client:
        raise HTTPException(status_code=503, detail="Admin service unavailable")
    return admin_client

def _sanitize_string(value: str, max_len: int = 200) -> str:
    """Strip dangerous characters and enforce max length."""
    if not value:
        return value
    # Remove any characters that could be used for injection
    cleaned = re.sub(r"[<>\"'%;()&+\\]", "", str(value))
    return cleaned[:max_len].strip()

def _admin_only(user=Depends(require_role("admin"))):
    return user

# --- Pydantic Models ---

class EventUpdatePayload(BaseModel):
    is_active: Optional[bool] = None

class UserUpdatePayload(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    vibe_coins: Optional[int] = None

    @validator("role")
    def validate_role(cls, v):
        allowed = {"admin", "owner", "worker", "customer", "user"}
        if v and v not in allowed:
            raise ValueError(f"Invalid role. Must be one of: {allowed}")
        return v

    @validator("vibe_coins")
    def validate_coins(cls, v):
        if v is not None and (v < 0 or v > 10_000_000):
            raise ValueError("Coin balance must be between 0 and 10,000,000")
        return v

class VenueUpdatePayload(BaseModel):
    name: Optional[str] = None
    plan_type: Optional[str] = None
    subscription_status: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    vibe_tags: Optional[list] = None

    @validator("subscription_status")
    def validate_status(cls, v):
        allowed = {"inactive", "pending_approval", "active", "expired", "rejected"}
        if v and v not in allowed:
            raise ValueError(f"Invalid status")
        return v

class PerkUpdatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    coin_price: Optional[int] = None
    is_active: Optional[bool] = None

    @validator("coin_price")
    def validate_price(cls, v):
        if v is not None and (v < 1 or v > 1_000_000):
            raise ValueError("Coin price must be between 1 and 1,000,000")
        return v


# =====================
# USERS
# =====================

@router.get("/users")
async def list_users(
    search: Optional[str] = Query(None, max_length=100),
    role: Optional[str] = Query(None, max_length=50),
    user=Depends(_admin_only)
):
    """List all users from profiles table."""
    db = _get_admin_db()
    try:
        # Use phone_number (now exists)
        query = db.table("profiles").select("id, full_name, email, role, phone_number, vibecoins, created_at")
        if role and role != "all":
            query = query.eq("role", _sanitize_string(role, 50))
        result = query.execute()
        data = result.data or []

        # Apply search client-side on safe data (already fetched via PostgREST)
        if search:
            search_lower = _sanitize_string(search, 100).lower()
            data = [
                u for u in data
                if search_lower in (u.get("full_name") or "").lower()
            ]
        return data
    except Exception as e:
        print(f"DEBUG ADMIN API - Failed to fetch users: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to fetch users: {str(e)}")


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdatePayload,
    user=Depends(_admin_only)
):
    """Update a user's profile. Admin only."""
    # Validate UUID format to prevent path traversal
    if not re.match(r'^[0-9a-f-]{36}$', user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    db = _get_admin_db()
    try:
        update_data = {}
        if payload.full_name is not None:
            update_data["full_name"] = _sanitize_string(payload.full_name)
        if payload.role is not None:
            update_data["role"] = payload.role
        if payload.phone is not None:
            update_data["phone_number"] = _sanitize_string(payload.phone, 20)
            # Sync with legacy store_phone if it exists
            update_data["store_phone"] = _sanitize_string(payload.phone, 20)
        if payload.vibe_coins is not None:
            update_data["vibecoins"] = payload.vibe_coins

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        result = db.table("profiles").update(update_data).eq("id", user_id).execute()
        return {"message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to update user")


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user=Depends(_admin_only)):
    """Deep delete user and all associated data."""
    if not re.match(r'^[0-9a-f-]{36}$', user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    
    db = _get_admin_db()
    try:
        # 1. Delete events owned by user
        db.table("events").delete().eq("owner_id", user_id).execute()
        
        # 2. Find venues owned by user to delete their dependants
        venues_res = db.table("venues").select("id").eq("owner_id", user_id).execute()
        for v in (venues_res.data or []):
            vid = v["id"]
            # Delete perks, items, team members for this venue
            db.table("venue_perks").delete().eq("venue_id", vid).execute()
            db.table("venue_items").delete().eq("venue_id", vid).execute()
            db.table("venue_team").delete().eq("venue_id", vid).execute()

        # 3. Delete venues
        db.table("venues").delete().eq("owner_id", user_id).execute()
        
        # 4. Delete profile and auth
        db.table("profiles").delete().eq("id", user_id).execute()
        db.auth.admin.delete_user(user_id)
        
        return {"message": "User and all related data deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete user: {str(e)}")


@router.post("/cleanup-legacy-roles")
async def cleanup_legacy_roles(admin=Depends(_admin_only)):
    """Delete all users with the 'business' role and their data."""
    db = _get_admin_db()
    try:
        res = db.table("profiles").select("id").eq("role", "business").execute()
        count = 0
        for user in (res.data or []):
            # Reuse the deletion logic
            await delete_user(user["id"], admin)
            count += 1
        return {"message": f"Cleaned up {count} legacy users"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================
# VENUES
# =====================

@router.get("/venues")
async def list_venues(
    search: Optional[str] = Query(None, max_length=100),
    plan: Optional[str] = Query(None, max_length=50),
    billing_status: Optional[str] = Query(None, max_length=50),
    user=Depends(_admin_only)
):
    """List all venues with subscription info."""
    db = _get_admin_db()
    try:
        # Use the newly created columns
        query = db.table("venues").select(
            "id, name, address, description, subscription_status, plan_type, last_payment_proof, expiry_date, is_active, created_at, owner_id"
        )
        if billing_status and billing_status != "all":
            query = query.eq("subscription_status", _sanitize_string(billing_status, 50))
        if plan and plan != "all":
            query = query.eq("plan_type", _sanitize_string(plan, 50))

        result = query.execute()
        data = result.data or []

        if search:
            search_lower = _sanitize_string(search, 100).lower()
            data = [v for v in data if search_lower in (v.get("name") or "").lower()]

        return data
    except Exception as e:
        print(f"DEBUG ADMIN API - Failed to fetch venues: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to fetch venues: {str(e)}")


@router.patch("/venues/{venue_id}")
async def update_venue(venue_id: str, payload: VenueUpdatePayload, user=Depends(_admin_only)):
    """Update a venue. Admin only."""
    if not re.match(r'^[0-9a-f-]{36}$', venue_id):
        raise HTTPException(status_code=400, detail="Invalid venue ID format")

    db = _get_admin_db()
    try:
        update_data = {}
        if payload.name is not None:
            update_data["name"] = _sanitize_string(payload.name)
        if payload.plan_type is not None:
            update_data["plan_type"] = _sanitize_string(payload.plan_type, 50)
            # Sync with subscription_tier for compatibility
            update_data["subscription_tier"] = _sanitize_string(payload.plan_type, 50)
            # Auto-activate if changing from FREE and no state provided
            if payload.plan_type.upper() != "FREE" and payload.subscription_status is None:
                update_data["subscription_status"] = "active"
                update_data["expiry_date"] = (datetime.utcnow() + timedelta(days=30)).isoformat()
                update_data["is_active"] = True

        if payload.subscription_status is not None:
            update_data["subscription_status"] = payload.subscription_status
            if payload.subscription_status == "active":
                update_data["expiry_date"] = (datetime.utcnow() + timedelta(days=30)).isoformat()
                update_data["is_active"] = True
            elif payload.subscription_status in ["inactive", "rejected", "expired"]:
                update_data["is_active"] = False
        if payload.address is not None:
            update_data["address"] = _sanitize_string(payload.address)
        if payload.description is not None:
            update_data["description"] = _sanitize_string(payload.description, 1000)
        if payload.vibe_tags is not None:
            update_data["vibe_tags"] = payload.vibe_tags

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        # Use admin client to bypass RLS
        res = db.table("venues").update(update_data).eq("id", venue_id).execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Venue not found or update failed")
        return {"message": "Venue updated successfully", "data": res.data[0]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update venue")


# =====================
# EVENTS
# =====================

@router.get("/events")
async def list_events(
    search: Optional[str] = Query(None, max_length=100),
    event_status: Optional[str] = Query(None, max_length=50),
    user=Depends(_admin_only)
):
    """List all events."""
    db = _get_admin_db()
    try:
        query = db.table("events").select(
            "id, title, description, event_date, venue_id, created_at, status, is_active, venues(name)"
        ).order("event_date", desc=True)

        if event_status and event_status != "all":
            query = query.eq("status", _sanitize_string(event_status, 50))

        result = query.execute()
        data = result.data or []

        if search:
            search_lower = _sanitize_string(search, 100).lower()
            data = [e for e in data if search_lower in (e.get("title") or "").lower()]

        return data
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to fetch events")


@router.patch("/events/{event_id}")
async def update_event(event_id: str, payload: EventUpdatePayload, user=Depends(_admin_only)):
    """Update an event. Admin only."""
    if not re.match(r'^[0-9a-f-]{36}$', event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID format")

    db = _get_admin_db()
    try:
        update_data = {}
        if payload.is_active is not None:
            update_data["is_active"] = payload.is_active

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        db.table("events").update(update_data).eq("id", event_id).execute()
        return {"message": "Event updated successfully"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update event")


# =====================
# PERKS
# =====================

@router.get("/perks")
async def list_perks(
    search: Optional[str] = Query(None, max_length=100),
    venue_id: Optional[str] = Query(None),
    user=Depends(_admin_only)
):
    """List all perks across all venues."""
    db = _get_admin_db()
    try:
        query = db.table("venue_perks").select("*, venue:venues(name)")
        if venue_id:
            if not re.match(r'^[0-9a-f-]{36}$', venue_id):
                raise HTTPException(status_code=400, detail="Invalid venue ID")
            query = query.eq("venue_id", venue_id)

        result = query.execute()
        data = result.data or []

        if search:
            search_lower = _sanitize_string(search, 100).lower()
            data = [p for p in data if search_lower in (p.get("title") or "").lower()]

        return data
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to fetch perks")


@router.patch("/perks/{perk_id}")
async def update_perk(perk_id: str, payload: PerkUpdatePayload, user=Depends(_admin_only)):
    """Update a perk. Admin only."""
    if not re.match(r'^[0-9a-f-]{36}$', perk_id):
        raise HTTPException(status_code=400, detail="Invalid perk ID format")

    db = _get_admin_db()
    try:
        update_data = {}
        if payload.title is not None:
            update_data["title"] = _sanitize_string(payload.title)
        if payload.description is not None:
            update_data["description"] = _sanitize_string(payload.description, 500)
        if payload.coin_price is not None:
            update_data["coin_price"] = payload.coin_price
        if payload.is_active is not None:
            update_data["active"] = payload.is_active

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        db.table("venue_perks").update(update_data).eq("id", perk_id).execute()
        return {"message": "Perk updated"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update perk")


@router.delete("/perks/{perk_id}")
async def delete_perk(perk_id: str, user=Depends(_admin_only)):
    """Delete a perk. Admin only."""
    if not re.match(r'^[0-9a-f-]{36}$', perk_id):
        raise HTTPException(status_code=400, detail="Invalid perk ID format")

    db = _get_admin_db()
    try:
        db.table("venue_perks").delete().eq("id", perk_id).execute()
        return {"message": "Perk deleted"}
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to delete perk")


# =====================
# BILLING / BILLS
# =====================

@router.get("/bills")
async def list_bills(
    search: Optional[str] = Query(None, max_length=100),
    billing_status: Optional[str] = Query(None, max_length=50),
    user=Depends(_admin_only)
):
    """List all venues that have gone through the billing flow."""
    db = _get_admin_db()
    try:
        # Now we can use the original logic
        query = db.table("venues").select(
            "id, name, plan_type, subscription_status, last_payment_proof, expiry_date, created_at, owner_id"
        ).or_("last_payment_proof.not.is.null,plan_type.neq.FREE,subscription_status.eq.rejected")

        if billing_status and billing_status != "all":
            query = query.eq("subscription_status", _sanitize_string(billing_status, 50))

        result = query.execute()
        data = result.data or []

        if search:
            search_lower = _sanitize_string(search, 100).lower()
            data = [b for b in data if search_lower in (b.get("name") or "").lower()]

        return data
    except Exception as e:
        print(f"DEBUG ADMIN API - Failed to fetch billing records: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to fetch billing records: {str(e)}")


@router.post("/bills/approve/{venue_id}")
async def approve_bill(venue_id: str, user=Depends(_admin_only)):
    """Approve a venue subscription and notify the owner by email."""
    if not re.match(r'^[0-9a-f-]{36}$', venue_id):
        raise HTTPException(status_code=400, detail="Invalid venue ID format")

    db = _get_admin_db()
    try:
        # 1. Fetch venue + owner info for email
        venue_res = db.table("venues").select(
            "subscription_tier, plan_type, name, owner_id"
        ).eq("id", venue_id).single().execute()

        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Venue not found")

        venue_data = venue_res.data
        requested_plan = venue_data.get("subscription_tier") or venue_data.get("plan_type") or "free"
        venue_name = venue_data.get("name", "Tu local")
        owner_id = venue_data.get("owner_id")

        # 2. Calculate and persist expiry_date (+30 days)
        expiry_dt = datetime.utcnow() + timedelta(days=30)
        expiry_iso = expiry_dt.isoformat()
        expiry_display = expiry_dt.strftime("%d/%m/%Y")

        db.table("venues").update({
            "subscription_status": "active",
            "subscription_tier": requested_plan,
            "expiry_date": expiry_iso,
            "is_active": True,
        }).eq("id", venue_id).execute()

        # 3. In-app notification (fire and forget, don't block response)
        try:
            db.table("notifications").insert({
                "user_id": owner_id,
                "type": "success",
                "title": "Plan Activado 🎉",
                "message": f"Tu plan {requested_plan} para {venue_name} fue aprobado. ¡Ya tienes acceso completo!",
                "link": "/business"
            }).execute()
        except Exception as notif_err:
            print(f"[approve_bill] Notification insert failed (non-fatal): {notif_err}")

        # 4. Send approval email (fetch owner email first)
        asyncio.ensure_future(_send_approval_email(db, owner_id, venue_name, requested_plan, expiry_display))

        return {
            "message": "Venue approved and activated",
            "expiry_date": expiry_iso,
            "plan": requested_plan
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[approve_bill] Error: {e}")
        raise HTTPException(status_code=400, detail="Failed to approve venue")


async def _send_approval_email(db, owner_id: str, venue_name: str, plan_name: str, expiry_display: str):
    """Background task: fetch owner email and send approval email."""
    try:
        profile_res = db.table("profiles").select("full_name, email").eq("id", owner_id).single().execute()
        if not profile_res.data:
            print(f"[_send_approval_email] Profile not found for owner {owner_id}")
            return
        owner_name = profile_res.data.get("full_name") or "Dueño"
        owner_email = profile_res.data.get("email", "")
        if not owner_email:
            print(f"[_send_approval_email] No email for owner {owner_id}")
            return
        await send_subscription_approved_email(
            to_email=owner_email,
            owner_name=owner_name,
            venue_name=venue_name,
            plan_name=plan_name,
            expiry_date=expiry_display,
            dashboard_url=f"{settings.app_url}/business"
        )
    except Exception as e:
        print(f"[_send_approval_email] Failed (non-fatal): {e}")


@router.post("/bills/reject/{venue_id}")
async def reject_bill(venue_id: str, user=Depends(_admin_only)):
    """Reject a venue subscription with notification, retry tracking, and email."""
    if not re.match(r'^[0-9a-f-]{36}$', venue_id):
        raise HTTPException(status_code=400, detail="Invalid venue ID format")

    db = _get_admin_db()
    try:
        # 1. Fetch venue data for notification and email
        venue_res = db.table("venues").select("owner_id, name, billing_retry_count").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Venue not found")

        venue = venue_res.data
        new_retry_count = (venue.get("billing_retry_count") or 0) + 1

        # 2. Update venue status and retry tracking
        db.table("venues").update({
            "subscription_status": "rejected",
            "billing_retry_count": new_retry_count,
            "last_bill_rejection_at": datetime.utcnow().isoformat()
        }).eq("id", venue_id).execute()

        # 3. In-app notification for owner
        try:
            db.table("notifications").insert({
                "user_id": venue["owner_id"],
                "type": "alert",
                "title": "Pago Rechazado",
                "message": f"No fue aceptado su pago para {venue['name']}. Vuelva a subir la imagen o contáctate con soporte.",
                "link": "/business/subscription"
            }).execute()
        except Exception as notif_err:
            print(f"[reject_bill] Notification insert failed (non-fatal): {notif_err}")

        # 4. Send rejection email (background, non-blocking)
        asyncio.ensure_future(_send_rejection_email(
            db=db,
            owner_id=venue["owner_id"],
            venue_name=venue["name"],
            retry_count=new_retry_count
        ))

        return {
            "message": "Venue rejected and notification sent",
            "retry_count": new_retry_count
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error rejecting bill: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to reject venue")


async def _send_rejection_email(db, owner_id: str, venue_name: str, retry_count: int):
    """Background task: fetch owner email and send rejection email."""
    try:
        profile_res = db.table("profiles").select("full_name, email").eq("id", owner_id).single().execute()
        if not profile_res.data:
            return
        owner_name = profile_res.data.get("full_name") or "Dueño"
        owner_email = profile_res.data.get("email", "")
        if not owner_email:
            return
        await send_subscription_rejected_email(
            to_email=owner_email,
            owner_name=owner_name,
            venue_name=venue_name,
            retry_count=retry_count
        )
    except Exception as e:
        print(f"[_send_rejection_email] Failed (non-fatal): {e}")


# =====================
# HOUSEKEEPING
# =====================

@router.post("/expire-stale-venues")
async def expire_stale_venues(user=Depends(_admin_only)):
    """
    Housekeeping endpoint: marks all venues with subscription_status='active'
    and expiry_date < NOW() as 'expired' and notifies their owners by email.
    Designed to be called once per day (by the APScheduler job in main.py).
    """
    db = _get_admin_db()
    now_iso = datetime.utcnow().isoformat()
    expired_count = 0
    errors = []

    try:
        # Find all venues that are active but past their expiry_date
        stale_res = db.table("venues").select(
            "id, name, owner_id, expiry_date"
        ).eq("subscription_status", "active").lt("expiry_date", now_iso).execute()

        stale_venues = stale_res.data or []
        print(f"[expire_stale_venues] Found {len(stale_venues)} stale venue(s) to expire.")

        for venue in stale_venues:
            venue_id = venue["id"]
            try:
                # Mark as expired
                db.table("venues").update({
                    "subscription_status": "expired",
                    "is_active": False,
                }).eq("id", venue_id).execute()

                # In-app notification
                try:
                    db.table("notifications").insert({
                        "user_id": venue["owner_id"],
                        "type": "alert",
                        "title": "Plan Vencido",
                        "message": f"El plan de {venue['name']} ha vencido. Renueva para mantener el acceso.",
                        "link": "/business/subscription"
                    }).execute()
                except Exception:
                    pass  # Non-fatal

                # Send expiration email (background)
                asyncio.ensure_future(_send_expiration_email(db, venue["owner_id"], venue["name"]))
                expired_count += 1

            except Exception as venue_err:
                errors.append({"venue_id": venue_id, "error": str(venue_err)})
                print(f"[expire_stale_venues] Failed for venue {venue_id}: {venue_err}")

        return {
            "expired_count": expired_count,
            "errors": errors,
            "checked_at": now_iso,
        }
    except Exception as e:
        print(f"[expire_stale_venues] Fatal error: {e}")
        raise HTTPException(status_code=500, detail=f"Expiration job failed: {str(e)}")


async def _send_expiration_email(db, owner_id: str, venue_name: str):
    """Background task: fetch owner email and send expiration email."""
    try:
        profile_res = db.table("profiles").select("full_name, email").eq("id", owner_id).single().execute()
        if not profile_res.data:
            return
        owner_name = profile_res.data.get("full_name") or "Dueño"
        owner_email = profile_res.data.get("email", "")
        if not owner_email:
            return
        await send_subscription_expired_email(
            to_email=owner_email,
            owner_name=owner_name,
            venue_name=venue_name,
            renewal_url=f"{settings.app_url}/business/subscription"
        )
    except Exception as e:
        print(f"[_send_expiration_email] Failed (non-fatal): {e}")
