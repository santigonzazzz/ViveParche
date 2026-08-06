"""
User settings router for VibeMap AI.
Handles profile updates, billing, and security.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import os
from pydantic import BaseModel, Field
from app.services import settings_service
from app.dependencies import get_current_user
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/settings", tags=["Settings"])


class ProfileUpdate(BaseModel):
    """Schema for updating user profile and associated venue."""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    image_url: Optional[str] = None 
    # Venue specific fields
    venue_name: Optional[str] = None
    description: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    website_url: Optional[str] = None
    menu_url: Optional[str] = None
    menu_text: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    special_offers_pdf_url: Optional[str] = None
    special_offers_text: Optional[str] = None
    special_offers_json: Optional[List[Dict[str, Any]]] = None


class PasswordChange(BaseModel):
    """Schema for changing password. old_password is optional since admin API is used."""
    old_password: Optional[str] = None
    new_password: str = Field(..., min_length=8)


@router.put("/profile")
async def update_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    """Update user profile details (except email)."""
    try:
        return await settings_service.update_profile(user["id"], req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/security/password")
async def change_password(req: PasswordChange, user=Depends(get_current_user)):
    """Securely change user password. old_password is accepted but not required
    since we use Supabase Admin API which doesn't need the current password."""
    try:
        return await settings_service.change_password(user["id"], req.old_password or "", req.new_password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/billing/methods")
async def get_billing_methods(user=Depends(get_current_user)):
    """Fetch saved payment methods."""
    try:
        return await settings_service.get_billing(user["id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/notifications")
async def update_notifications(settings: dict, user=Depends(get_current_user)):
    """Update user notification preferences."""
    try:
        return await settings_service.update_notification_settings(user["id"], settings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/security/2fa")
async def toggle_2fa(enabled: bool, user=Depends(get_current_user)):
    """Toggle two-factor authentication."""
    try:
        return await settings_service.toggle_2fa(user["id"], enabled)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    """Fetch recent notifications for the user."""
    try:
        return await settings_service.get_notifications(user["id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    """Mark a specific notification as read."""
    try:
        return await settings_service.mark_notification_read(user["id"], notification_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...), user=Depends(get_current_user)):
    """
    Upload venue logo / profile photo. Only .jpg and .png allowed.
    The uploaded image is stored in Supabase Storage and the venue record is updated.
    """
    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes .jpg y .png")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Extensión de archivo no permitida")

    try:
        from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
        import uuid

        contents = await file.read()
        file_name = f"logos/{user['id']}/{uuid.uuid4()}.{ext}"

        storage_res = supabase_admin.storage.from_("venue-logos").upload(
            file_name,
            contents,
            {"content-type": file.content_type, "upsert": "true"}
        )

        public_url = supabase_admin.storage.from_("venue-logos").get_public_url(file_name).rstrip('?')
        
        # Standardize public URL handling
        target_domain = os.getenv("API_PUBLIC_URL", "https://viveparche.cloud")
        if "localhost" in public_url or "127.0.0.1" in public_url:
            public_url = public_url.replace("http://localhost:8000", target_domain)
            public_url = public_url.replace("http://127.0.0.1:8000", target_domain)

        # Update venue record
        supabase_admin.table("venues").update({"image_url": public_url}).eq("owner_id", user["id"]).execute()

        return {"image_url": public_url}
    except Exception as e:
        import traceback
        print(f"❌ Error in upload_logo: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
