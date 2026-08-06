"""
Security middleware for VibeMap AI Business Dashboard.
Implements rate limiting, RECAPTCHA, audit logging, and role-based access control.
"""

import time
import hashlib
from functools import wraps
from typing import Dict, Optional, Callable
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
import httpx
from app.config import settings
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
from app.dependencies import get_current_user

# =====================================================
# RATE LIMITING
# =====================================================

class RateLimiter:
    """In-memory rate limiter (use Redis in production)"""
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
    
    def is_allowed(self, identifier: str, max_requests: int, window_seconds: int) -> bool:
        """Check if request is allowed within rate limit"""
        now = time.time()
        window_start = now - window_seconds
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > window_start
        ]
        
        # Check limit
        if len(self.requests[identifier]) >= max_requests:
            return False
        
        self.requests[identifier].append(now)
        return True

rate_limiter = RateLimiter()

def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """
    Rate limiting decorator.
    
    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from args (positional) or kwargs (keyword)
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                # FastAPI passes all params as kwargs — scan values by type
                for val in kwargs.values():
                    if isinstance(val, Request):
                        request = val
                        break
            
            if request:
                forwarded = request.headers.get("X-Forwarded-For")
                real_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
                
                # Use IP + user agent as identifier
                identifier = f"{real_ip}:{request.headers.get('user-agent', '')}"
                identifier_hash = hashlib.md5(identifier.encode()).hexdigest()
                
                if not rate_limiter.is_allowed(identifier_hash, max_requests, window_seconds):
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again later."
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# =====================================================
# RECAPTCHA VERIFICATION
# =====================================================

async def verify_recaptcha(token: str, action: str = "submit") -> bool:
    """
    Verify Google reCAPTCHA v3 token.
    
    Args:
        token: reCAPTCHA token from client
        action: Expected action name
    
    Returns:
        True if verification passed, False otherwise
    """
    if not settings.recaptcha_secret_key:
        # Skip in development if not configured
        return True
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": settings.recaptcha_secret_key,
                    "response": token
                }
            )
            result = response.json()
            
            # Check score (0.0 - 1.0, higher is better)
            if result.get("success") and result.get("score", 0) >= 0.5:
                # Verify action matches
                if result.get("action") == action:
                    return True
            
            return False
    except Exception as e:
        print(f"reCAPTCHA verification error: {e}")
        return False

# =====================================================
# AUDIT LOGGING
# =====================================================

async def log_audit(
    user_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None
):
    """
    Log security-sensitive operations.
    
    Args:
        user_id: User performing the action
        action: Action name (e.g., "create_event", "delete_user")
        resource_type: Type of resource (e.g., "event", "user")
        resource_id: ID of the resource
        details: Additional details
        request: FastAPI request object for IP and user agent
    """
    try:
        log_data = {
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": request.client.host if request else None,
            "user_agent": request.headers.get("user-agent") if request else None
        }
        
        admin_client.table("audit_logs").insert(log_data).execute()
    except Exception as e:
        # Don't fail the request if audit logging fails
        print(f"Audit logging error: {e}")

# =====================================================
# ROLE-BASED ACCESS CONTROL
# =====================================================

async def require_owner(request: Request, user: dict = Depends(get_current_user)):
    """Dependency to require owner role (or global admin impersonation)"""
    user_role = user.get("role", "customer")
    
    if user_role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de dueño para esta acción."
        )

    # Resolution for admin impersonation
    if user_role == "admin":
        vid = request.query_params.get("venue_id")
        if vid:
            client = supabase_admin if supabase_admin else supabase
            venue = client.table("venues").select("owner_id").eq("id", vid).execute()
            if venue.data:
                user["context_venue_id"] = vid
                user["context_owner_id"] = venue.data[0]["owner_id"]
    
    return user


async def require_business(request: Request, user: dict = Depends(get_current_user)):
    """
    Dependency to require business roles (owner, manager, worker, or admin).
    Authorized staff can view data but not necessarily modify sensitive settings.
    """
    user_role = user.get("role", "customer")
    
    if user_role not in ["owner", "manager", "worker", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a esta sección de negocio."
        )
    
    # Resolve venue context for workers and admins
    client = supabase_admin if supabase_admin else supabase
    vid = None
    
    if user_role == "admin":
        vid = request.query_params.get("venue_id")
    elif user_role == "worker":
        # Resolve which venue this worker belongs to
        team_link = client.table("venue_team").select("venue_id").eq("member_id", user["id"]).execute()
        if team_link.data:
            vid = team_link.data[0]["venue_id"]
    
    # If we have a venue_id, set the context for the services
    if vid:
        venue = client.table("venues").select("owner_id").eq("id", vid).execute()
        if venue.data:
            user["context_venue_id"] = vid
            user["context_owner_id"] = venue.data[0]["owner_id"]

    return user


async def require_venue_admin(user: dict = Depends(get_current_user)):
    """Dependency to require venue-level administrative roles (owner or manager)"""
    user_role = user.get("role", "customer")
    
    if user_role not in ["owner", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción requiere permisos administrativos del local."
        )
    
    return user


async def require_global_admin(user: dict = Depends(get_current_user)):
    """Dependency to require strict global site admin role"""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores globales."
        )
    return user

async def check_subscription_access(user: dict, required_plan: str = "basic") -> bool:
    """
    Check if user's subscription allows access to a feature.
    
    Args:
        user: User object
        required_plan: Minimum required plan (basic, pro, premium)
    
    Returns:
        True if user has access, raises HTTPException otherwise
    """
    plan_hierarchy = {"basic": 1, "pro": 2, "premium": 3}
    
    try:
        # Get active subscription
        subscription = admin_client.table("subscriptions") \
            .select("*") \
            .eq("user_id", user["id"]) \
            .eq("status", "active") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if not subscription.data:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Active subscription required. Please subscribe to continue."
            )
        
        user_plan = subscription.data[0]["plan_type"]
        
        # Check plan level
        if plan_hierarchy.get(user_plan, 0) < plan_hierarchy.get(required_plan, 99):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires a {required_plan} plan or higher. Please upgrade your subscription."
            )
        
        return True
    except HTTPException:
        raise
    except Exception as e:
        print(f"Subscription check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking subscription status"
        )

# =====================================================
# INPUT SANITIZATION
# =====================================================

def sanitize_input(text: str, max_length: int = 10000) -> str:
    """
    Sanitize user input to prevent XSS and injection attacks.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
    
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Truncate
    text = text[:max_length]
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Remove control characters except newlines and tabs
    text = ''.join(char for char in text if char == '\n' or char == '\t' or ord(char) >= 32)
    
    return text.strip()

def validate_email(email: str) -> bool:
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_url(url: str) -> bool:
    """Validate URL format"""
    import re
    pattern = r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
    return bool(re.match(pattern, url))

# =====================================================
# CORS & CSP HEADERS
# =====================================================

async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Content Security Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "connect-src 'self' https://api.openai.com https://viveparche.cloud;"
    )
    
    # Other security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

# =====================================================
# TEAM PERMISSION CHECKER
# =====================================================

async def check_team_permission(user_id: str, store_id: str, required_role: Optional[str] = None) -> bool:
    """
    Check if user has permission to access a store's resources.
    
    Args:
        user_id: User ID
        store_id: Store/owner ID
        required_role: Required role (owner, manager, staff) or None for any team member
    
    Returns:
        True if user has permission
    """
    # Check if user is the owner
    if user_id == store_id:
        return True
    
    # Check if user is a team member
    query = admin_client.table("team_members") \
        .select("*") \
        .eq("store_id", store_id) \
        .eq("user_id", user_id) \
        .eq("accepted", True)
    
    if required_role:
        query = query.eq("role", required_role)
    
    result = query.execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this store's resources"
        )
    
    return True
