"""
Authentication service for VibeMap AI.
Handles Supabase Auth and custom OTP verification logic.
CI/CD: Auto-deployed via GitHub Actions.
"""

import os
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.services.supabase_service import supabase_admin as admin_client
from app.models.venue import VenueCreate
from app.utils.crypto import generate_user_hash, generate_qr_payload
from app.services import venue_service
from app.services import email_service


async def generate_otp(email: str) -> str:
    """Generate and store a 6-digit OTP, then send it via email."""
    code = ''.join(random.choices(string.digits, k=6))
    
    try:
        existing = admin_client.table("auth_codes").select("*").eq("email", email).execute()
        
        data = {
            "email": email,
            "code": code,
            "attempts": 0,
            "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
            "blocked_until": None
        }
        
        if existing.data:
            admin_client.table("auth_codes").update(data).eq("email", email).execute()
        else:
            admin_client.table("auth_codes").insert(data).execute()
            
        # Send real email (falls back to console log if RESEND_API_KEY not set)
        await email_service.send_verification_email(email, code)
        print(f"DEBUG OTP [{email}]: {code}")  # Always log for admin visibility
        return code
    except Exception as e:
        raise Exception(f"Failed to generate OTP: {str(e)}")


async def generate_forgot_password_otp(email: str) -> dict:
    """
    Generate and send a password-reset OTP.
    Rules:
      - Code expires in 5 minutes
      - Max 3 wrong attempts before a 5-minute cooldown
      - Returns error info if the user is still blocked
    """
    # 1. Check if user exists — query profiles table directly (faster and reliable)
    profile_res = admin_client.table("profiles").select("id").eq("email", email).maybe_single().execute()
    if not profile_res.data:
        raise Exception("No hay una cuenta asociada a este correo.")

    # 2. Check cooldown
    now = datetime.utcnow()
    existing = admin_client.table("auth_codes").select("*").eq("email", email).execute()
    if existing.data:
        record = existing.data[0]
        if record.get("blocked_until"):
            blocked_until = datetime.fromisoformat(record["blocked_until"].replace('Z', '+00:00')).replace(tzinfo=None)
            if now < blocked_until:
                diff = int((blocked_until - now).total_seconds())
                raise Exception(f"Demasiados intentos fallidos. Espera {diff // 60}m {diff % 60}s.")

    # 3. Generate new code (5 min expiry)
    code = ''.join(random.choices(string.digits, k=6))
    data = {
        "email": email,
        "code": code,
        "attempts": 0,
        "expires_at": (now + timedelta(minutes=5)).isoformat(),
        "blocked_until": None,
        "purpose": "forgot_password"
    }

    if existing.data:
        admin_client.table("auth_codes").update(data).eq("email", email).execute()
    else:
        admin_client.table("auth_codes").insert(data).execute()

    # 4. Send email
    await email_service.send_forgot_password_email(email, code)
    print(f"DEBUG FORGOT_PW [{email}]: {code}")
    return {"sent": True}


async def check_forgot_password_otp(email: str, code: str) -> dict:
    """
    Check if the reset OTP is valid without deleting it or changing password.
    Used for frontend validation step.
    """
    res = admin_client.table("auth_codes").select("*").eq("email", email).execute()
    if not res.data:
        raise Exception("No se encontr\u00f3 ning\u00fan c\u00f3digo para este correo.")

    record = res.data[0]
    now = datetime.utcnow()

    # Check block
    if record.get("blocked_until"):
        blocked_until = datetime.fromisoformat(record["blocked_until"].replace('Z', '+00:00')).replace(tzinfo=None)
        if now < blocked_until:
            diff = int((blocked_until - now).total_seconds())
            raise Exception(f"Bloqueado por {diff // 60}m {diff % 60}s. Intenta nuevamente m\u00e1s tarde.")

    # Check expiry
    expires_at = datetime.fromisoformat(record["expires_at"].replace('Z', '+00:00')).replace(tzinfo=None)
    if now > expires_at:
        raise Exception("El c\u00f3digo ha expirado. Solicita uno nuevo.")
    
    # Check purpose
    if record.get("purpose") != "forgot_password":
         raise Exception("C\u00f3digo inv\u00e1lido para recuperaci\u00f3n de contrase\u00f1a.")

    if record["code"] == code:
        # Correct!
        return {"valid": True}
    else:
        # Wrong code
        attempts = record.get("attempts", 0) + 1
        if attempts >= 3:
            blocked_until = (now + timedelta(minutes=3)).isoformat()
            admin_client.table("auth_codes").update({
                "attempts": 0,
                "blocked_until": blocked_until,
            }).eq("email", email).execute()
            raise Exception("C\u00f3digo incorrecto 3 veces. Espera 3 minutos para intentar nuevamente.")
        else:
            remaining = 3 - attempts
            admin_client.table("auth_codes").update({"attempts": attempts}).eq("email", email).execute()
            raise Exception(f"C\u00f3digo incorrecto. {remaining} intento(s) restante(s).")


async def verify_forgot_password_otp(email: str, code: str, new_password: str) -> dict:
    """
    Verify the reset OTP and update the password.
    """
    # 1. Use the common check logic (this handles attempts, blocks, and expiry)
    await check_forgot_password_otp(email, code)

    # 2. If valid, actually perform the update and delete the code
    admin_client.table("auth_codes").delete().eq("email", email).execute()

    # Find the user ID
    from app.services.supabase_service import supabase_admin as admin_client_admin
    try:
        profile_res = admin_client.table("profiles").select("id").eq(
            # profiles doesn't have email column — look in auth
            "id", "00000000-0000-0000-0000-000000000000"  # placeholder
        ).execute()
    except Exception:
        pass

    # Use admin API to find user by email and update password
    users = supabase_admin.auth.admin.list_users()
    target = next((u for u in users if u.email == email), None)
    if not target:
        raise Exception("Usuario no encontrado.")

    supabase_admin.auth.admin.update_user_by_id(
        target.id,
        attributes={"password": new_password}
    )
    return {"message": "\u00a1Contrase\u00f1a actualizada con \u00e9xito!"}


async def register_user(email, password, full_name, role="customer", business_data=None):
    """Register a new user and generate verification code."""
    try:
        # 1. Supabase Auth - usar admin.create_user en lugar de sign_up().
        # CRÍTICO: sign_up() muta la sesión del cliente admin a role=authenticated,
        # lo que hace que los INSERT posteriores en profiles/auth_codes fallen con RLS 42501
        # (política RESTRICTIVE backend_only bloquea a {anon, authenticated}).
        # admin.create_user() NO muta la sesión, el cliente permanece como service_role.
        try:
            res = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,  # Auto-confirmar en auth; usamos OTP propio para verificación
            })
            user_id = res.user.id if res.user else None
        except Exception as signup_err:
            err_str = str(signup_err).lower()
            # Log the exact raw error so we can debug it
            print(f"⚠️ SIGNUP ERROR raw='{str(signup_err)}' lower='{err_str}'")
            if (
                "already registered" in err_str
                or "already been registered" in err_str
                or "user already exists" in err_str
                or "email address has already been registered" in err_str
            ):
                raise Exception("Email already registered. Please login instead.")
            else:
                raise signup_err

        if not user_id:
            raise Exception("Signup failed: Could not determine User ID.")
        
        # Generate unique Parché Identity
        hash_id = generate_user_hash(user_id)
        qr_payload = generate_qr_payload(user_id, hash_id)

        # 2. Add to profiles table
        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "user_hash_id": hash_id,
            "qr_payload": qr_payload
        }
        
        # Add business info if owner
        if role == "owner" and business_data:
            profile_data.update({
                "store_name": business_data.get("store_name"),
                "store_bio": business_data.get("description"),
                "store_address": business_data.get("address"),
                "store_phone": business_data.get("whatsapp_number"),
                "store_logo": business_data.get("image_url")
            })

        admin_client.table("profiles").upsert(profile_data).execute()
        
        # 2a. Automatically create venue for owners
        if role == "owner" and business_data:
            from uuid import UUID
            try:
                # Ensure municipality_id is provided and is a valid format
                m_id = business_data.get("municipality_id")
                
                # Check for validity before trying to create a UUID
                is_valid_uuid = False
                if m_id and str(m_id).lower() != "none" and str(m_id).strip() != "":
                    try:
                        valid_m_uuid = UUID(str(m_id))
                        is_valid_uuid = True
                    except ValueError:
                        is_valid_uuid = False

                if not is_valid_uuid:
                    print(f"WARNING: Invalid municipality_id '{m_id}' provided. Venue will not be created.")
                else:
                    venue_payload = VenueCreate(
                        owner_id=user_id,
                        municipality_id=valid_m_uuid,
                        name=business_data.get("store_name", "My Venue"),
                        description=business_data.get("description"),
                        image_url=business_data.get("image_url"),
                        address=business_data.get("address"),
                        whatsapp_number=business_data.get("whatsapp_number"),
                        vibe_tags=business_data.get("vibes", []),
                        price_range=business_data.get("price_range", 1)
                    )
                    await venue_service.register_venue(venue_payload)
            except Exception as venue_err:
                import traceback
                print(f"❌ Error creating automatic venue for user {user_id}: {str(venue_err)}")
                traceback.print_exc()
                # Critical error, re-raise
                raise Exception(f"Venue creation failed: {str(venue_err)}")
        
        # 3. Generate OTP
        await generate_otp(email)
        
        return {
            "message": "Registration successful. Please verify your email.", 
            "user_id": user_id
        }
    except Exception as e:
        error_msg = str(e)
        if "rate limit" in error_msg.lower():
            raise Exception("Email rate limit exceeded. Please wait a few minutes or use a different email.")
        raise Exception(f"Registration error: {error_msg}")


async def login_user(email, password):
    """Sign in a user."""
    try:
        res = admin_client.auth.sign_in_with_password({"email": email, "password": password})
        if not res.user:
            raise Exception("Login failed")
        
        # Check if user needs verification (OTP still in auth_codes and is for registration)
        otp_check = admin_client.table("auth_codes").select("*").eq("email", email).is_("purpose", "null").execute()
        verification_required = len(otp_check.data) > 0
        
        # Fetch profile using admin client to bypass RLS, and maybe_single to avoid errors if missing
        client = admin_client
        profile = client.table("profiles").select("*").eq("id", res.user.id).maybe_single().execute()
        profile_data = profile.data if profile.data else {}
        
        # Ensure hash/QR exist (manual fix for existing users during login)
        if profile_data and (not profile_data.get("user_hash_id") or not profile_data.get("qr_payload")):
            hash_id = profile_data.get("user_hash_id") or generate_user_hash(res.user.id)
            qr_payload = profile_data.get("qr_payload") or generate_qr_payload(res.user.id, hash_id)
            client.table("profiles").update({
                "user_hash_id": hash_id,
                "qr_payload": qr_payload
            }).eq("id", res.user.id).execute()
            profile_data["user_hash_id"] = hash_id
            profile_data["qr_payload"] = qr_payload

        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "verification_required": verification_required,
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "full_name": profile_data.get("full_name", "User"),
                "role": profile_data.get("role", "customer"),
                "user_hash_id": profile_data.get("user_hash_id"),
                "qr_payload": profile_data.get("qr_payload")
            }
        }
    except Exception as e:
        raise Exception(f"Login error: {str(e)}")


async def verify_otp(email: str, code: str, password: Optional[str] = None):
    """Verify the OTP with attempt limiting and blocking. On success, auto-login if password is provided."""
    try:
        res = admin_client.table("auth_codes").select("*").eq("email", email).execute()
        if not res.data:
            raise Exception("No code found for this email")
        
        record = res.data[0]
        now = datetime.utcnow()
        
        # Check if blocked
        if record["blocked_until"]:
            blocked_until = datetime.fromisoformat(record["blocked_until"].replace('Z', '+00:00'))
            if now.replace(tzinfo=blocked_until.tzinfo) < blocked_until:
                diff = blocked_until - now.replace(tzinfo=blocked_until.tzinfo)
                minutes = int(diff.total_seconds() // 60)
                raise Exception(f"Too many wrong attempts. Account blocked for {minutes + 1} more minutes.")

        # Check if expired
        expires_at = datetime.fromisoformat(record["expires_at"].replace('Z', '+00:00'))
        if now.replace(tzinfo=expires_at.tzinfo) > expires_at:
            raise Exception("Code expired. Please request a new one.")

        if record["code"] == code:
            # Success - Clear the code record
            admin_client.table("auth_codes").delete().eq("email", email).execute()

            # Auto-login: if password provided, sign in and return full session
            if password:
                try:
                    login_result = await login_user(email, password)
                    login_result["verified"] = True
                    return login_result
                except Exception as login_err:
                    print(f"Auto-login after verify failed: {login_err}")
                    # Fall through to basic verified response

            return {"verified": True, "message": "Email verified successfully"}
        else:
            attempts = record.get("attempts", 0) + 1
            if attempts >= 3:
                # Block for 15 mins and generate new code for next time
                blocked_until = (now + timedelta(minutes=15)).isoformat()
                new_code = ''.join(random.choices(string.digits, k=6))
                admin_client.table("auth_codes").update({
                    "attempts": 0, 
                    "blocked_until": blocked_until,
                    "code": new_code,
                    "expires_at": (now + timedelta(minutes=30)).isoformat()
                }).eq("email", email).execute()
                raise Exception("Wrong code 3 times. Search blocked for 15 minutes. A new code will be sent then.")
            else:
                admin_client.table("auth_codes").update({"attempts": attempts}).eq("email", email).execute()
                raise Exception(f"Invalid code. {3 - attempts} attempts remaining.")
                
    except Exception as e:
        raise Exception(str(e))


async def update_user_password(user_id: str, new_password: str):
    """Update a user's password using the admin client."""
    try:
        from app.services.supabase_service import supabase_admin as admin_client_admin
        supabase_admin.auth.admin.update_user_by_id(
            user_id,
            attributes={"password": new_password}
        )
    except Exception as e:
        raise Exception(f"Failed to update password: {str(e)}")
async def delete_user_account(user_id: str):
    """Permanently delete a user profile and their Auth account."""
    try:
        from app.services.supabase_service import supabase_admin as admin_client_admin
        # 1. Delete profile (cascading deletes usually handles related data, but we're explicit)
        supabase_admin.table("profiles").delete().eq("id", user_id).execute()
        
        # 2. Delete Auth account
        supabase_admin.auth.admin.delete_user(user_id)
    except Exception as e:
        raise Exception(f"Failed to delete user account: {str(e)}")
