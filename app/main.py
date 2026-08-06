"""
Main application entry point for VibeMap AI backend.
FastAPI application with CORS and routing configuration.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from collections import defaultdict
import asyncio
import time
import hashlib
import os

# Load environment variables
load_dotenv()

from app.routers import (
    events, bookings, ai, municipalities, auth, 
    tickets, rewards, business, settings, chat_management,
    venues, discovery, perks, team, loyalty, subscriptions, admin_api, reviews
)
from app.middleware.security import add_security_headers

# ---------------------------------------------------------------------------
# Daily subscription expiration job (asyncio-native, no APScheduler needed)
# ---------------------------------------------------------------------------
_EXPIRATION_INTERVAL_SECONDS = 24 * 60 * 60  # 24 hours
_INITIAL_DELAY_SECONDS = 60  # Wait for full startup before first run


async def _run_expiration_job():
    """Background coroutine: expires stale subscriptions once a day."""
    await asyncio.sleep(_INITIAL_DELAY_SECONDS)  # Let the server fully start
    while True:
        try:
            print("[scheduler] Running daily subscription expiration job...")
            from app.services.supabase_service import supabase_admin as admin_client
            from app.services.email_service import send_subscription_expired_email
            from app.config import settings
            from datetime import datetime

            db = admin_client
            now_iso = datetime.utcnow().isoformat()
            stale_res = db.table("venues").select(
                "id, name, owner_id, expiry_date"
            ).eq("subscription_status", "active").lt("expiry_date", now_iso).execute()

            stale_venues = stale_res.data or []
            print(f"[scheduler] Expiring {len(stale_venues)} stale venue(s).")

            for venue in stale_venues:
                try:
                    db.table("venues").update({
                        "subscription_status": "expired",
                        "is_active": False,
                    }).eq("id", venue["id"]).execute()

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
                        pass

                    # Email owner
                    try:
                        profile_res = db.table("profiles").select("full_name, email").eq(
                            "id", venue["owner_id"]
                        ).single().execute()
                        if profile_res.data and profile_res.data.get("email"):
                            await send_subscription_expired_email(
                                to_email=profile_res.data["email"],
                                owner_name=profile_res.data.get("full_name") or "Dueño",
                                venue_name=venue["name"],
                                renewal_url=f"{settings.app_url}/business/subscription"
                            )
                    except Exception as mail_err:
                        print(f"[scheduler] Email failed for {venue['id']}: {mail_err}")

                except Exception as venue_err:
                    print(f"[scheduler] Could not expire venue {venue['id']}: {venue_err}")

            print(f"[scheduler] Done. Next run in {_EXPIRATION_INTERVAL_SECONDS // 3600}h.")
        except asyncio.CancelledError:
            print("[scheduler] Expiration job cancelled (shutdown).")
            return
        except Exception as e:
            print(f"[scheduler] Unexpected error: {e}")
        await asyncio.sleep(_EXPIRATION_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifecycle: start scheduler on boot, cancel on shutdown."""
    task = asyncio.create_task(_run_expiration_job())
    print("[lifespan] Subscription expiration scheduler started.")
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        print("[lifespan] Scheduler stopped.")


# Create FastAPI application
# Disable docs in production for security
_is_prod = os.getenv("ENVIRONMENT", "production") == "production"
app = FastAPI(
    title="VibeMap AI API",
    description="Backend API for VibeMap AI event management and AI chat",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
	"http://localhost:5173",
	"http://31.97.214.152:5173",
	"http://31.97.214.152",
	"https://viveparche.cloud",
	"https://www.viveparche.cloud",
	"https://viveparche.cloud/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Rate Limiter (in-memory, per IP) ───────────────────────────────────
# Limits: 200 requests per minute per IP (normal browsing), 20 per minute for
# auth endpoints to prevent brute force. Works as middleware applied before routing.

# Global Rate Limiters (in-memory, per IP)
_rl_global: dict = defaultdict(list)
_rl_sensitive: dict = defaultdict(list)
_banned_ips = set()
_ip_strikes = defaultdict(int)

MAX_STRIKES_BEFORE_BAN = 5

def _is_rate_limited(ip: str, tracker: dict, max_req: int, window: int = 60) -> bool:
    now = time.time()
    cutoff = now - window
    tracker[ip] = [t for t in tracker[ip] if t > cutoff]
    if len(tracker[ip]) >= max_req:
        return True
    tracker[ip].append(now)
    return False

# Per-route stricter limits for auth endpoints (prevent brute force)
_sensitive_prefixes = ["/api/auth/login", "/api/auth/register", "/api/auth/forgot"]

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    ip = get_client_ip(request)
    
    # Fast path for blacklisted IPs
    if ip in _banned_ips:
        return JSONResponse(
            status_code=403,
            content={"detail": "Access Denied: Tu IP ha sido baneada y bloqueada en la blacklist permanentemente por actividad sospechosa."},
        )

    path = request.url.path

    # 1. Check Global Limit (200 req/min)
    if _is_rate_limited(ip, _rl_global, max_req=200, window=60):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."},
            headers={"Retry-After": "60"}
        )

    # 2. Check Sensitive Limit (20 req/min - slightly increased from 15)
    is_sensitive = any(path.startswith(p) for p in _sensitive_prefixes)
    if is_sensitive:
        if _is_rate_limited(ip, _rl_sensitive, max_req=20, window=60):
            _ip_strikes[ip] += 1
            
            # If they hit the SENSITIVE rate limit too many times, ban them
            if _ip_strikes[ip] >= MAX_STRIKES_BEFORE_BAN:
                _banned_ips.add(ip)
                print(f"🚨 SECURITY ALERT: IP {ip} has been permanently BANNED for sensitive rate limit abuse.")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Access Denied: Tu IP ha sido baneada y bloqueada en la blacklist permanentemente por actividad sospechosa."},
                )
                
            return JSONResponse(
                status_code=429,
                content={"detail": "Acción demasiado frecuente. Por seguridad, espera un momento."},
                headers={"Retry-After": "60"}
            )

    return await call_next(request)

# Add security headers middleware
app.middleware("http")(add_security_headers)

# Include routers with /api prefix to match frontend expectations
app.include_router(auth.router, prefix="/api")
app.include_router(municipalities.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(rewards.router, prefix="/api")
app.include_router(business.router, prefix="/api")
app.include_router(chat_management.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(venues.router, prefix="/api")
app.include_router(discovery.router, prefix="/api")
app.include_router(perks.router, prefix="/api")
app.include_router(team.router, prefix="/api")
app.include_router(loyalty.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(admin_api.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")



# Global exception handler — prevents stack traces leaking to clients
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions globally."""
    print(f"UNHANDLED ERROR [{request.method} {request.url.path}]: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Ha ocurrido un error interno. Intenta de nuevo."},
    )


# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "VibeMap AI API",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Deep health check — verifies DB connectivity."""
    from datetime import datetime, timezone
    import time

    checks = {"api": "ok", "database": "unknown", "timestamp": datetime.now(timezone.utc).isoformat()}
    status_code = 200

    # Check Supabase DB connectivity
    try:
        start = time.time()
        from app.services.supabase_service import supabase_admin as admin_client
        result = admin_client.table("municipalities").select("id").limit(1).execute()
        db_ms = round((time.time() - start) * 1000)
        checks["database"] = "ok"
        checks["db_latency_ms"] = db_ms
    except Exception as e:
        checks["database"] = f"error: {str(e)[:100]}"
        status_code = 503

    checks["status"] = "healthy" if status_code == 200 else "degraded"

    from fastapi.responses import JSONResponse
    return JSONResponse(content=checks, status_code=status_code)
