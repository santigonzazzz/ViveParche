from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from app.services.supabase_service import supabase_admin as admin_client
from app.dependencies import get_current_user, require_role
from datetime import datetime, timedelta
import os
import uuid

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Tiers"])

@router.post("/submit-proof")
async def submit_payment_proof(
    venue_id: str = Form(...),
    plan_type: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """
    Submit a screenshot of payment proof for a venue subscription.
    """
    try:
        # 1. Verify ownership and check retry limits
        venue_res = admin_client.table("venues").select("id, owner_id, billing_retry_count, last_bill_rejection_at").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        venue = venue_res.data
        if venue["owner_id"] != user["id"]:
            # Also check if user is a manager in venue_team
            team_res = admin_client.table("venue_team").select("role").eq("venue_id", venue_id).eq("member_id", user["id"]).execute()
            roles = [t["role"] for t in (team_res.data or [])]
            if "manager" not in roles and "owner" not in roles:
                raise HTTPException(status_code=403, detail="Not authorized to manage this venue")

        # Check retry count (Max 3)
        retry_count = venue.get("billing_retry_count") or 0
        if retry_count >= 3:
            raise HTTPException(
                status_code=400, 
                detail="Has superado el límite de 3 intentos de pago. Por favor, contacta a soporte para reactivar tu cuenta."
            )
        
        # Check cooldown (6 hours)
        last_rejection = venue.get("last_bill_rejection_at")
        if last_rejection:
            rejection_time = datetime.fromisoformat(last_rejection.replace('Z', '+00:00'))
            if datetime.utcnow() < rejection_time.replace(tzinfo=None) + timedelta(hours=6):
                wait_time = (rejection_time.replace(tzinfo=None) + timedelta(hours=6)) - datetime.utcnow()
                hours, remainder = divmod(int(wait_time.total_seconds()), 3600)
                minutes, _ = divmod(remainder, 60)
                raise HTTPException(
                    status_code=400,
                    detail=f"Debe esperar 6 horas tras un rechazo para volver a intentarlo. Tiempo restante: {hours}h {minutes}m."
                )

        # 2. Upload file to Supabase Storage
        file_ext = file.filename.split(".")[-1]
        file_name = f"{venue_id}/{uuid.uuid4()}.{file_ext}"
        contents = await file.read()
        
        # We use the admin client to bypass RLS for uploads if needed, or regular client if bucket is public/correctly configured
        storage_client = admin_client if admin_client else supabase
        
        res = storage_client.storage.from_("payment-proofs").upload(file_name, contents, {"content-type": file.content_type})
        
        if hasattr(res, 'error') and res.error:
            raise Exception(res.error)
            
        file_url = storage_client.storage.from_("payment-proofs").get_public_url(file_name).rstrip('?')
        
        # Standardize public URL handling
        target_domain = os.getenv("API_PUBLIC_URL", "https://viveparche.cloud")
        if "localhost" in file_url or "127.0.0.1" in file_url:
            file_url = file_url.replace("http://localhost:8000", target_domain)
            file_url = file_url.replace("http://127.0.0.1:8000", target_domain)

        # 3. Update venue status
        update_res = admin_client.table("venues").update({
            "subscription_status": "pending_approval",
            "plan_type": plan_type,           # New column
            "subscription_tier": plan_type,    # Sync for compatibility
            "last_payment_proof": file_url
        }).eq("id", venue_id).execute()

        return {"message": "Payment proof submitted successfully. Waiting for approval.", "url": file_url}

    except Exception as e:
        print(f"Error submitting proof: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/admin/approvals")
async def get_pending_approvals(user=Depends(require_role("admin"))):
    """
    List all venues waiting for subscription approval.
    """
    try:
        res = admin_client.table("venues").select("id, name, owner_id, plan_type, last_payment_proof, profiles(full_name)") \
            .eq("subscription_status", "pending_approval").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/admin/approve-venue/{venue_id}")
async def approve_venue_subscription(venue_id: str, user=Depends(require_role("admin"))):
    """
    Approve a venue's subscription and set expiry date.
    """
    try:
        expiry = datetime.utcnow() + timedelta(days=30)
        res = admin_client.table("venues").update({
            "subscription_status": "active",
            "expiry_date": expiry.isoformat(),
            "is_active": True
        }).eq("id", venue_id).execute()
        
        if not res.data:
            raise Exception("Venue not found or update failed")
            
        return {"message": "Venue approved successfully", "expiry_date": expiry}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status/{venue_id}")
async def get_subscription_status(venue_id: str, user=Depends(get_current_user)):
    """
    Get the detailed subscription status for a venue.
    """
    try:
        res = admin_client.table("venues").select("subscription_status, plan_type, expiry_date, is_active").eq("id", venue_id).single().execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
