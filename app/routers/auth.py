"""
Authentication router for VibeMap AI.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Form, File, UploadFile
import os
import json
from pydantic import BaseModel, EmailStr, Field
from app.services import auth_service
from app.dependencies import get_current_user
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)


class BusinessRegisterRequest(BaseModel):
    """Schema for business registration."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    store_name: str = Field(..., min_length=2)
    description: Optional[str] = None
    address: Optional[str] = None
    whatsapp_number: Optional[str] = None
    image_url: Optional[str] = None
    municipality_id: Optional[UUID] = None
    vibes: Optional[list] = []


class LoginRequest(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class VerifyCodeRequest(BaseModel):
    """Schema for OTP verification."""
    email: EmailStr
    code: str
    password: Optional[str] = None


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest):
    """Register a new user and send verification code."""
    try:
        return await auth_service.register_user(
            email=req.email, 
            password=req.password, 
            full_name=req.full_name,
            role="customer"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/business/register", status_code=status.HTTP_201_CREATED)
async def register_business(
    email: EmailStr = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    store_name: str = Form(...),
    description: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    whatsapp_number: Optional[str] = Form(None),
    municipality_id: Optional[str] = Form(None),
    vibes: str = Form("[]"),
    logo: Optional[UploadFile] = File(None)
):
    """
    Register a new business owner and venue.
    Supports logo upload via multipart/form-data.
    """
    try:
        # 1. Parse vibes
        try:
            vibes_list = json.loads(vibes)
        except:
            vibes_list = []

        # 2. Handle logo upload if provided
        image_url = None
        if logo:
            # Validate file type
            if logo.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only JPG and PNG images are allowed."
                )
            
            from app.services.supabase_service import supabase_admin
            import uuid
            
            file_ext = logo.filename.split(".")[-1]
            file_name = f"logos/{uuid.uuid4()}.{file_ext}"
            contents = await logo.read()
            
            storage_res = supabase_admin.storage.from_("venue-logos").upload(
                file_name, 
                contents, 
                {"content-type": logo.content_type}
            )
            
            if not hasattr(storage_res, 'error') or not storage_res.error:
                image_url = supabase_admin.storage.from_("venue-logos").get_public_url(file_name).rstrip('?')
                
                # Standardize public URL handling
                target_domain = os.getenv("API_PUBLIC_URL", "https://viveparche.cloud")
                if "localhost" in image_url or "127.0.0.1" in image_url:
                    image_url = image_url.replace("http://localhost:8000", target_domain)
                    image_url = image_url.replace("http://127.0.0.1:8000", target_domain)

        business_data = {
            "store_name": store_name,
            "description": description,
            "address": address,
            "image_url": image_url,
            "vibes": vibes_list,
            "municipality_id": municipality_id,
            "whatsapp_number": whatsapp_number
        }
        
        return await auth_service.register_user(
            email=email,
            password=password,
            full_name=full_name,
            role="owner",
            business_data=business_data
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/google")
async def google_login(redirect_to: str = "https://test.viveparche.cloud/auth/callback"):
    """Get the Google OAuth login URL for Supabase."""
    try:
        from app.config import settings
        
        url = f"{settings.supabase_url}/auth/v1/authorize?provider=google&redirect_to={redirect_to}"
        return {"url": url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/login")
async def login(req: LoginRequest):
    """Login a user."""
    try:
        return await auth_service.login_user(req.email, req.password)
    except Exception as e:
        # Temporary: show exact error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/verify")
async def verify(req: VerifyCodeRequest):
    """Verify the OTP code. If password is provided, auto-login and return session token."""
    try:
        return await auth_service.verify_otp(req.email, req.code, req.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """Get current user profile."""
    return user

@router.get("/system/config")
async def get_system_config(user=Depends(get_current_user)):
    """Securely provide admin routing config only to actual admins."""
    if user.get("role") == "admin":
        return {
            "access_granted": True,
            "nav_label": "Admin",
            "dashboard_route": "/admin" 
        }
    raise HTTPException(status_code=403, detail="Forbidden")


# ── Forgot Password ──────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordVerifyRequest(BaseModel):
    email: EmailStr
    code: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=8)


class ResendOtpRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Request a password-reset OTP email.
    Always returns 200 (even for unknown emails) to prevent user enumeration.
    """
    try:
        return await auth_service.generate_forgot_password_otp(req.email)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify-forgot-password")
async def verify_forgot_password(req: ForgotPasswordVerifyRequest):
    """
    Verify the reset OTP without changing password.
    """
    try:
        return await auth_service.check_forgot_password_otp(req.email, req.code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """
    Verify the OTP and set a new password.
    Returns 400 with remaining attempts / block time on failure.
    """
    try:
        return await auth_service.verify_forgot_password_otp(
            req.email, req.code, req.new_password
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/resend-otp")
async def resend_otp(req: ResendOtpRequest):
    """Resend the account verification OTP."""
    try:
        await auth_service.generate_otp(req.email)
        return {"message": "Código reenviado con éxito."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sync-profile")
async def sync_profile(user=Depends(get_current_user)):
    """
    Explicitly trigger profile synchronization/healing.
    Returns the updated profile.
    """
    return user
