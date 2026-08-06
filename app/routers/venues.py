"""
Venue router for VibeMap AI.
Endpoints for venue registration, details, and updates.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header, UploadFile, File, Form, Request
import os
import uuid
from uuid import UUID
from typing import Dict, Any, Optional, List
from app.models.venue import VenueCreate, VenueUpdate, VenueResponse
from app.services import venue_service
from app.services.pdf_service import extract_text_from_bytes
from app.middleware.security import require_business, require_owner
from app.dependencies import get_current_user

router = APIRouter(prefix="/venues", tags=["Venues"])


@router.post("/register", response_model=VenueResponse, status_code=status.HTTP_201_CREATED)
async def register_venue(
    venue: VenueCreate,
    user=Depends(require_owner)
):
    """
    Register a new venue.
    Only business owners can register venues.
    """
    try:
        if str(venue.owner_id) != str(user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only register venues for yourself."
            )
        return await venue_service.register_venue(venue)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/profile")
async def get_venue_profile(
    venue_id: Optional[str] = None,
    user=Depends(require_business)
):
    """
    Get the authenticated owner's venue profile or impersonated for admin.
    Workers get the venue they are linked to via venue_team.
    """
    try:
        from app.services.supabase_service import supabase_admin as admin_client_admin

        # If admin and venue_id provided, fetch THAT venue bypassing ownership
        if user.get("role") == "admin" and venue_id:
            res = supabase_admin.table("venues").select("*").eq("id", venue_id).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Venue not found")
            return res.data[0]

        # For workers: resolve their venue via venue_team link
        if user.get("role") == "worker":
            team_res = supabase_admin.table("venue_team") \
                .select("venue_id") \
                .eq("member_id", user["id"]) \
                .limit(1) \
                .execute()
            if not team_res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No se encontró un local vinculado a tu cuenta de mesero."
                )
            linked_venue_id = team_res.data[0]["venue_id"]
            venue_res = supabase_admin.table("venues").select("*").eq("id", linked_venue_id).execute()
            if not venue_res.data:
                raise HTTPException(status_code=404, detail="Venue not found")
            return venue_res.data[0]

        # Default: fetch the user's owned venue
        venue = await venue_service.get_owner_venue(UUID(user["id"]))
        if not venue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No venue found for this owner."
            )
        return venue
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/profile", response_model=VenueResponse)
async def update_venue_profile(
    venue_data: VenueUpdate,
    user=Depends(require_business)
):
    """
    Update the authenticated owner's venue profile.
    Manages detailed data like hours, price range, and menu.
    """
    try:
        print(f"DEBUG: update_venue_profile received payload: {venue_data.model_dump()}")
        venue = await venue_service.get_owner_venue(UUID(user["id"]))
        if not venue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No venue found for this owner."
            )
        return await venue_service.update_venue(UUID(venue["id"]), venue_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{id}")
async def get_venue(
    id: str,
    x_user_lat: Optional[float] = Header(None, alias="X-User-Lat"),
    x_user_lng: Optional[float] = Header(None, alias="X-User-Lng")
):
    """
    Get full venue details including hosted events using ID or Slug.
    Optional user coordinates in headers for distance calculation.
    """
    try:
        return await venue_service.get_venue(id, x_user_lat, x_user_lng)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{id}/menu")
async def get_venue_menu(id: str):
    """
    Redirects to the venue's menu PDF with a clean URL.
    """
    try:
        from fastapi.responses import StreamingResponse
        import httpx

        venue = await venue_service.get_venue(id)
        if not venue.get("menu_url"):
            raise HTTPException(status_code=404, detail="Este local no tiene un menú PDF configurado.")
        
        menu_url = venue["menu_url"]

        # If it's a supabase URL or any other http URL, proxy it securely.
        async def fetch_menu():
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", menu_url) as response:
                    # Check if the fetch was successful
                    if response.status_code != 200:
                        raise HTTPException(status_code=404, detail="El menú no está disponible en este momento.")
                    
                    async for chunk in response.aiter_bytes():
                        yield chunk

        # Return a streaming response that mimics the actual PDF
        return StreamingResponse(
            fetch_menu(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=menu_{id}.pdf"}
        )

    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{id}/view", status_code=status.HTTP_200_OK, summary="Track a user's view of a venue")
async def track_venue_view(id: UUID, request: Request, entity_type: str = "venue"):
    """
    Register that a user has viewed this venue or event card.
    12-hour cooldown per user (or IP for anonyms) per entity. Silent failure.
    """
    from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
    from datetime import datetime, timezone, timedelta

    client = supabase_admin if supabase_admin else supabase

    try:
        # Determine user identity: authenticated user_id OR anonymous IP fingerprint
        auth_header = request.headers.get("Authorization", "")
        user_id = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                user_res = admin_client.auth.get_user(token)
                if user_res and user_res.user:
                    user_id = user_res.user.id
            except Exception:
                pass

        if not user_id:
            # Fall back to IP-based fingerprint for anonymous visitors
            client_ip = (
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
                or request.headers.get("X-Real-IP", "")
                or (request.client.host if request.client else "unknown")
            )
            user_agent = request.headers.get("User-Agent", "")[:50]
            # Use a deterministic string as the "user_id" for anon tracking
            user_id = f"anon::{client_ip}::{user_agent}"

        entity_id = str(id)
        now = datetime.now(timezone.utc)
        cooldown_cutoff = (now - timedelta(hours=12)).isoformat()

        existing = client.table("entity_views") \
            .select("id, last_viewed_at") \
            .eq("user_id", user_id) \
            .eq("entity_type", entity_type) \
            .eq("entity_id", entity_id) \
            .limit(1) \
            .execute()

        if existing.data:
            last = existing.data[0]["last_viewed_at"]
            if last and last > cooldown_cutoff:
                return {"tracked": False, "reason": "cooldown_active"}
            client.table("entity_views") \
                .update({"last_viewed_at": now.isoformat()}) \
                .eq("id", existing.data[0]["id"]) \
                .execute()
        else:
            client.table("entity_views").insert({
                "user_id": user_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "last_viewed_at": now.isoformat(),
            }).execute()

        return {"tracked": True}
    except Exception as e:
        print(f"VIEW TRACKING ERROR ({entity_type}): {str(e)}")
        return {"tracked": False, "reason": str(e)}


@router.delete("/{venue_id}/images")
async def delete_venue_image(
    venue_id: str,
    image_url: str = Form(...),
    user=Depends(require_owner)
):
    """
    Delete a specific image from a venue's gallery.
    Only the owner of the venue can delete images.
    """
    try:
        # Check ownership
        current_venue = await venue_service.get_venue(UUID(venue_id))
        if str(current_venue["owner_id"]) != str(user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete images from this venue."
            )
        
        # Call service to delete image
        await venue_service.delete_venue_image(UUID(venue_id), image_url)
        return {"message": "Image deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{venue_id}", response_model=VenueResponse)
async def update_venue(
    venue_id: str,
    venue_update: VenueUpdate,
    user=Depends(require_owner)
):
    """
    Update venue details.
    Only the owner can update their venue.
    """
    try:
        # Check ownership
        current_venue = await venue_service.get_venue(UUID(venue_id))
        if str(current_venue["owner_id"]) != str(user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this venue."
            )
        return await venue_service.update_venue(UUID(venue_id), venue_update)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/search", response_model=List[VenueResponse])
async def search_venues(query: str):
    """Search for venues by name or description."""
    try:
        from app.services import supabase_service
        return await supabase_service.search_venues(query)
    except Exception as e:
        import traceback
        print(f"❌ Error in upload_logo: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding", response_model=VenueResponse, status_code=status.HTTP_201_CREATED)
async def onboarding_venue(
    venue_data: VenueCreate,
    user=Depends(require_business)
):
    """
    Onboarding endpoint for new business owners.
    Handles the 3-step registration flow data.
    Prevents duplicate venue creation for the same owner.
    """
    try:
        # Check if owner already has a venue
        existing = await venue_service.get_owner_venue(venue_data.owner_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Owner already has a venue. Use PUT /venues/profile to update."
            )
        
        if str(venue_data.owner_id) != str(user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create venues for yourself."
            )
        return await venue_service.register_venue(venue_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{venue_id}/images")
async def upload_venue_images(
    venue_id: str,
    files: List[UploadFile] = File(...),
    user=Depends(require_owner)
):
    """
    Upload multiple images to a venue's gallery.
    Only the owner of the venue can upload images.
    """
    try:
        # Check ownership
        current_venue = await venue_service.get_venue(UUID(venue_id))
        if str(current_venue["owner_id"]) != str(user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to upload images to this venue."
            )

        allowed_types = [
            "image/jpeg", "image/png", "image/jpg", "image/webp"
        ]
        
        uploaded_urls = []
        for file in files:
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type {file.content_type} not allowed for images."
                )

            from app.services.supabase_service import supabase_admin as admin_client_admin
            
            file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
            # Use a path structure that includes venue ID for gallery images
            file_name = f"venue_gallery/{venue_id}/{uuid.uuid4()}.{file_ext}"
            contents = await file.read()
            
            print(f"📤 Uploading {file.filename} to {file_name} (type: {file.content_type})")
            
            res = supabase_admin.storage.from_("venue-logos").upload(
                file_name, 
                contents, 
                {"content-type": file.content_type, "upsert": "true"}
            )
            
            if hasattr(res, 'error') and res.error:
                raise Exception(res.error)
                
            file_url = supabase_admin.storage.from_("venue-logos").get_public_url(file_name).rstrip('?')
            
            # Determine the target domain for public URLs
            target_domain = os.getenv("API_PUBLIC_URL", "https://viveparche.cloud")
            
            if "localhost" in file_url or "127.0.0.1" in file_url:
                file_url = file_url.replace("http://localhost:8000", target_domain)
                file_url = file_url.replace("http://127.0.0.1:8000", target_domain)
            
            uploaded_urls.append(file_url)
        
        # Update venue's gallery in the database
        await venue_service.add_images_to_gallery(UUID(venue_id), uploaded_urls)

        return {
            "urls": uploaded_urls,
            "message": f"{len(uploaded_urls)} images uploaded successfully."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload-file")
async def upload_venue_file(
    file: UploadFile = File(...),
    user=Depends(require_business)
):
    """
    Generic file upload for venues (gallery images, menus, etc.).
    Supports JPG, PNG, WEBP and PDF.
    """
    try:
        allowed_types = [
            "image/jpeg", "image/png", "image/jpg", "image/webp",
            "application/pdf"
        ]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file.content_type} not allowed."
            )

        from app.services.supabase_service import supabase_admin as admin_client_admin
        
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "file"
        # Determine folder based on content type
        sub_folder = "gallery" if "image" in file.content_type else "menus"
        # Use a path structure that includes user ID to comply with typical storage policies
        file_name = f"business/{user['id']}/{sub_folder}/{uuid.uuid4()}.{file_ext}"
        contents = await file.read()
        
        print(f"📤 Uploading {file.filename} to {file_name} (type: {file.content_type})")
        
        # Extract text if PDF
        extracted_text = None
        if file.content_type == "application/pdf":
            try:
                from app.services.pdf_service import extract_text_from_bytes
                extracted_text = await extract_text_from_bytes(contents)
            except Exception as e:
                print(f"⚠️ PDF extraction failed: {str(e)}")

        # Upload to 'venue-logos' bucket
        res = supabase_admin.storage.from_("venue-logos").upload(
            file_name, 
            contents, 
            {"content-type": file.content_type, "upsert": "true"}
        )
        
        if hasattr(res, 'error') and res.error:
            raise Exception(res.error)
            
        file_url = supabase_admin.storage.from_("venue-logos").get_public_url(file_name).rstrip('?')
        
        # Determine the target domain for public URLs
        target_domain = os.getenv("API_PUBLIC_URL", "https://viveparche.cloud")
        
        # Replace local or generic URLs with the correct public domain if needed
        if "localhost" in file_url or "127.0.0.1" in file_url:
            file_url = file_url.replace("http://localhost:8000", target_domain)
            file_url = file_url.replace("http://127.0.0.1:8000", target_domain)
        log_upload = f"DEBUG - File uploaded to storage: {file_url}\n"
        with open("/tmp/settings_debug.log", "a") as f:
            f.write(log_upload)
            
        return {
            "url": file_url,
            "menu_text": extracted_text
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/payment-proof")
async def submit_payment_proof(
    request: Request,
    user=Depends(require_business)
):
    """
    Upload payment proof and update venue status to pending.
    Uses request.form() to manually parse multipart data for robustness.
    """
    from fastapi import Request as FastAPIRequest
    try:
        # Parse the multipart form data manually for reliability
        form = await request.form()
        
        venue_id = form.get("venue_id")
        plan_type = form.get("plan_type")
        proof = form.get("proof")
        
        print(f"📝 Payment proof received: venue_id={venue_id}, plan_type={plan_type}, proof={proof}")
        
        # Validate required fields
        if not venue_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="venue_id is required")
        if not plan_type:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="plan_type is required")
        if not proof:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="proof file is required")
        
        # Validate file type
        content_type = getattr(proof, 'content_type', None) or 'image/jpeg'
        if content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only JPG and PNG images are allowed. Got: {content_type}"
            )

        from app.services.supabase_service import supabase_admin as admin_client_admin, supabase
        
        client = supabase_admin if supabase_admin else supabase
        if not client:
             raise Exception("Supabase client not initialized")

        filename = getattr(proof, 'filename', 'proof.jpg') or 'proof.jpg'
        file_ext = filename.split(".")[-1] if "." in filename else "jpg"
        file_name = f"payment_proofs/{venue_id}_{uuid.uuid4()}.{file_ext}"
        contents = await proof.read()
        
        print(f"📤 Uploading to storage: {file_name}, size={len(contents)} bytes")
        
        # Upload to 'payment-proofs' bucket
        res = client.storage.from_("payment-proofs").upload(
            path=file_name, 
            file=contents, 
            file_options={"content-type": content_type}
        )
        
        if hasattr(res, 'error') and res.error:
            raise Exception(f"Storage error: {res.error}")
            
        file_url = client.storage.from_("payment-proofs").get_public_url(file_name).rstrip('?')
        
        # Determine the target domain for public URLs
        target_domain = os.getenv("API_PUBLIC_URL", "https://viveparche.cloud")
        
        # Replace local or generic URLs with the correct public domain if needed
        # This handles cases where Supabase might return a localhost URL in development
        if "localhost" in file_url or "127.0.0.1" in file_url:
            file_url = file_url.replace("http://localhost:8000", target_domain)
            file_url = file_url.replace("http://127.0.0.1:8000", target_domain)
        
        print(f"✅ File uploaded: {file_url}")
        
        # Update venue using service
        result = await venue_service.submit_payment_proof(UUID(str(venue_id)), str(plan_type), file_url)
        print(f"✅ Venue updated successfully")
        return result

    except HTTPException as he:
        print(f"❌ HTTP Error in submit_payment_proof: {he.detail}")
        raise he
    except Exception as e:
        print(f"❌ Error in submit_payment_proof: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
