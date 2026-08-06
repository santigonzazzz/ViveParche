"""
Configuration settings for VibeMap AI.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_KEY", "")
    
    # JWT
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24  # 24 hours
    jwt_refresh_expiration_days: int = 30
    
    # OpenAI / Grok
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    grok_api_key: str = os.getenv("GROK_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    
    # Email
    sendgrid_api_key: str = os.getenv("SENDGRID_API_KEY", "")
    from_email: str = os.getenv("FROM_EMAIL", "noreply@vibemap.ai")
    
    # SMTP
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "465"))
    smtp_user: Optional[str] = os.getenv("SMTP_USER")
    smtp_pass: Optional[str] = os.getenv("SMTP_PASS")
    
    # reCAPTCHA
    recaptcha_secret_key: str = os.getenv("RECAPTCHA_SECRET_KEY", "")
    recaptcha_site_key: str = os.getenv("RECAPTCHA_SITE_KEY", "")
    
    # WhatsApp (Twilio)
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_whatsapp_from: str = os.getenv("TWILIO_WHATSAPP_FROM", "")
    
    # Weather API
    weather_api_key: str = os.getenv("WEATHER_API_KEY", "")
    
    # Redis (for caching and rate limiting in production)
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Application
    app_name: str = "VibeMap AI"
    app_url: str = os.getenv("APP_URL", "http://localhost:5173")
    api_url: str = os.getenv("API_URL", "http://localhost:8000")
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # Security
    allowed_origins: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://vibemap.ai"
    ]
    
    # Subscription Plans
    subscription_plans: dict = {
        "basic": {
            "price": 25000,
            "currency": "COP",
            "features": {
                "event_publishing": True,
                "qr_scanning": True,
                "basic_stats": True,
                "ai_suggestions": False,
                "advanced_analytics": False,
                "chat_management": False,
                "team_members": False
            },
            "limits": {
                "events_per_month": 10,
                "team_members": 0
            }
        },
        "pro": {
            "price": 100000,
            "currency": "COP",
            "features": {
                "event_publishing": True,
                "qr_scanning": True,
                "basic_stats": True,
                "ai_suggestions": True,
                "advanced_analytics": True,
                "chat_management": True,
                "team_members": True
            },
            "limits": {
                "events_per_month": 50,
                "team_members": 5
            }
        },
        "premium": {
            "price": 250000,
            "currency": "COP",
            "features": {
                "event_publishing": True,
                "qr_scanning": True,
                "basic_stats": True,
                "ai_suggestions": True,
                "advanced_analytics": True,
                "chat_management": True,
                "team_members": True,
                "priority_support": True,
                "white_label": True
            },
            "limits": {
                "events_per_month": -1,  # Unlimited
                "team_members": -1  # Unlimited
            }
        }
    }
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
