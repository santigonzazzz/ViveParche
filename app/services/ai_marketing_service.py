"""
AI Marketing service for VibeMap AI Business Dashboard.
Generates context-aware marketing suggestions and manages campaigns.
"""

import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from supabase import Client
from app.config import settings
from app.services.openai_service import get_chat_completion
from app.services.supabase_service import supabase_admin as admin_client
from app.services.email_service import _send_email_async


async def generate_suggestions(user_id: str, limit: int = 2) -> List[Dict[str, Any]]:
    """
    Generate AI-powered marketing suggestions based on context.
    
    Args:
        user_id: Store owner ID
        limit: Number of suggestions to generate
    
    Returns:
        List of marketing suggestions
    """
    # Get context data
    context = await _gather_context(user_id)
    
    # Generate suggestions using AI
    suggestions = await _ai_generate_suggestions(context, limit)
    
    # Store suggestions
    stored_suggestions = []
    for suggestion in suggestions:
        campaign_data = {
            "user_id": user_id,
            "title": suggestion["title"],
            "description": suggestion["description"],
            "context": context,
            "message_template": suggestion["message_template"],
            "target_audience": suggestion.get("target_audience", []),
            "status": "draft"
        }
        
        result = admin_client.table("ai_campaigns").insert(campaign_data).execute()
        if result.data:
            stored_suggestions.append(result.data[0])
    
    return stored_suggestions


async def _gather_context(user_id: str) -> Dict[str, Any]:
    """Gather context for AI suggestion generation"""
    context = {}
    
    # Recent events
    recent_events = admin_client.table("events") \
        .select("*") \
        .eq("owner_id", user_id) \
        .order("event_date", desc=True) \
        .limit(5) \
        .execute()
    
    context["recent_events"] = recent_events.data or []
    
    # Get weather if location available
    if recent_events.data and recent_events.data[0].get("location_address"):
        weather = await _get_weather_forecast()
        context["weather"] = weather
    
    # Recent sentiment
    sentiment_result = admin_client.table("chat_messages") \
        .select("sentiment") \
        .eq("store_id", user_id) \
        .gte("created_at", (datetime.utcnow() - timedelta(days=7)).isoformat()) \
        .execute()
    
    sentiments = [msg["sentiment"] for msg in (sentiment_result.data or []) if msg.get("sentiment")]
    if sentiments:
        positive_count = sentiments.count("positive")
        context["sentiment"] = {
            "overall": "positive" if positive_count / len(sentiments) > 0.6 else "neutral",
            "score": round(positive_count / len(sentiments), 2)
        }
    
    # Upcoming events
    upcoming_events = admin_client.table("events") \
        .select("*") \
        .eq("owner_id", user_id) \
        .gte("event_date", datetime.utcnow().isoformat()) \
        .order("event_date") \
        .limit(3) \
        .execute()
    
    context["upcoming_events"] = upcoming_events.data or []
    
    return context


async def _get_weather_forecast() -> Optional[Dict[str, Any]]:
    """Get weather forecast from API"""
    if not settings.weather_api_key:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            # Using OpenWeatherMap as example
            response = await client.get(
                f"https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "q": "Bogota,CO",  # Default to Bogota
                    "appid": settings.weather_api_key,
                    "units": "metric"
                },
                timeout=5.0
            )
            
            if response.status_code == 200:
                data = response.json()
                # Get next 3 days forecast
                forecast = data.get("list", [])[:8]  # Next 24 hours
                
                if forecast:
                    weather_main = forecast[0]["weather"][0]["main"]
                    temp = forecast[0]["main"]["temp"]
                    
                    return {
                        "condition": weather_main,
                        "temperature": temp,
                        "description": forecast[0]["weather"][0]["description"]
                    }
    except Exception as e:
        print(f"Weather API error: {e}")
    
    return None


async def _ai_generate_suggestions(context: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    """Use AI to generate marketing suggestions"""
    
    prompt = f"""You are a marketing expert for event venues. Based on the following context, generate {limit} actionable marketing suggestions.

Context:
- Recent Events: {len(context.get('recent_events', []))} events in the past month
- Weather: {context.get('weather', {}).get('condition', 'Unknown')}
- Customer Sentiment: {context.get('sentiment', {}).get('overall', 'neutral')}
- Upcoming Events: {len(context.get('upcoming_events', []))} events scheduled

Generate {limit} specific, actionable marketing suggestions. Each suggestion should include:
1. A catchy title
2. A brief description explaining the reasoning
3. A message template to send to customers
4. Target audience (e.g., "past_guests", "leads", "vip_customers")

Format your response as JSON array:
[
  {{
    "title": "Suggestion title",
    "description": "Why this suggestion makes sense",
    "message_template": "Hi {{{{name}}}}, message text here...",
    "target_audience": ["past_guests"]
  }}
]
"""
    
    try:
        ai_response = await get_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        
        # Parse JSON response
        import json
        suggestions = json.loads(ai_response)
        
        return suggestions[:limit]
    except Exception as e:
        print(f"AI suggestion generation error: {e}")
        # Fallback to template suggestions
        return _get_fallback_suggestions(context, limit)


def _get_fallback_suggestions(context: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    """Fallback suggestions when AI is unavailable"""
    suggestions = []
    
    weather = context.get("weather", {})
    if weather.get("condition") in ["Rain", "Drizzle", "Thunderstorm"]:
        suggestions.append({
            "title": "Rainy Day Indoor Promo",
            "description": f"It looks like rain this weekend 🌧️. Foot traffic might drop by 15%. I've drafted a promo for indoor seating to boost retention.",
            "message_template": "Hi {name}, Rainy days call for cozy vibes! ☔ Enjoy 20% off all indoor seating this weekend. Book now at {event_link}",
            "target_audience": ["past_guests", "leads"]
        })
    
    upcoming = context.get("upcoming_events", [])
    if upcoming:
        suggestions.append({
            "title": "Event Reminder Campaign",
            "description": "Upcoming event in 3 days. Send reminders to boost attendance.",
            "message_template": "Hi {name}, Don't forget! {event_name} is happening in 3 days. Secure your spot now! 🎉",
            "target_audience": ["past_guests"]
        })
    
    if context.get("sentiment", {}).get("overall") == "positive":
        suggestions.append({
            "title": "Capitalize on Positive Buzz",
            "description": "Customers are loving your events! Send a thank you and early bird offer.",
            "message_template": "Thank you for the amazing vibes, {name}! 🙏 As a thank you, here's 15% off our next event. Use code: VIBES15",
            "target_audience": ["past_guests"]
        })
    
    return suggestions[:limit]


async def send_campaign(campaign_id: str, user_id: str) -> Dict[str, Any]:
    """
    Send an AI marketing campaign to target audience.
    
    Args:
        campaign_id: Campaign ID
        user_id: Store owner ID
    
    Returns:
        Campaign send results
    """
    # Get campaign
    campaign_result = admin_client.table("ai_campaigns") \
        .select("*") \
        .eq("id", campaign_id) \
        .eq("user_id", user_id) \
        .execute()
    
    if not campaign_result.data:
        raise Exception("Campaign not found")
    
    campaign = campaign_result.data[0]
    
    # Get target audience
    recipients = await _get_target_audience(user_id, campaign["target_audience"])
    
    # Send via multiple channels
    metrics = {
        "emails_sent": 0,
        "whatsapp_sent": 0,
        "notifications_sent": 0,
        "engagement_rate": 0
    }
    
    for recipient in recipients:
        # Send email
        if recipient.get("email"):
            await _send_email(recipient["email"], campaign["message_template"], recipient)
            metrics["emails_sent"] += 1
        
        # Send WhatsApp
        if recipient.get("phone"):
            await _send_whatsapp(recipient["phone"], campaign["message_template"], recipient)
            metrics["whatsapp_sent"] += 1
        
        # Send web notification
        await _send_web_notification(recipient["id"], campaign["title"], campaign["description"])
        metrics["notifications_sent"] += 1
    
    # Update campaign status
    admin_client.table("ai_campaigns") \
        .update({
            "status": "sent",
            "sent_at": datetime.utcnow().isoformat(),
            "metrics": metrics
        }) \
        .eq("id", campaign_id) \
        .execute()
    
    return {
        "status": "sent",
        "recipients_count": len(recipients),
        "metrics": metrics
    }


async def _get_target_audience(user_id: str, audiences: List[str]) -> List[Dict[str, Any]]:
    """Get list of customers matching target audience criteria"""
    all_recipients = []
    
    if "past_guests" in audiences:
        # Get customers who attended events
        past_guests = admin_client.table("tickets") \
            .select("user_id, profiles!user_id(id, email, full_name, phone)") \
            .eq("events.owner_id", user_id) \
            .eq("attended", True) \
            .execute()
        
        for ticket in (past_guests.data or []):
            profile = ticket.get("profiles", {})
            if profile:
                all_recipients.append(profile)
    
    if "leads" in audiences:
        # Get customers from chats who haven't attended
        leads = admin_client.table("chat_conversations") \
            .select("customer_id, profiles!customer_id(id, email, full_name, phone)") \
            .eq("store_id", user_id) \
            .eq("category", "lead") \
            .execute()
        
        for conv in (leads.data or []):
            profile = conv.get("profiles", {})
            if profile:
                all_recipients.append(profile)
    
    # Remove duplicates by email
    unique_recipients = {r["email"]: r for r in all_recipients if r.get("email")}
    return list(unique_recipients.values())


async def _send_email(email: str, template: str, recipient: Dict[str, Any]):
    """Send real marketing email via Gmail SMTP"""
    try:
        full_name = recipient.get("full_name", "Parcero")
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                    background: #0a0a0f; color: white; padding: 2rem; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h1 style="color: #9333ea; margin: 0;">Vive Parche</h1>
                <p style="color: rgba(255,255,255,0.4); margin: 0.5rem 0 0 0;">
                    Mensaje especial para ti
                </p>
            </div>
            <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
                Hola {full_name},
            </p>
            <div style="background: rgba(147,51,234,0.1); border: 1px solid rgba(147,51,234,0.3);
                        border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                <p style="color: white; line-height: 1.6; margin: 0;">
                    {template}
                </p>
            </div>
            <div style="text-align: center; margin-top: 2rem;">
                <a href="https://viveparche.cloud" 
                   style="background: #9333ea; color: white; padding: 0.75rem 2rem;
                          border-radius: 100px; text-decoration: none; font-weight: 700;">
                    Ver en Vive Parche
                </a>
            </div>
            <div style="margin-top: 2rem; padding-top: 1rem;
                        border-top: 1px solid rgba(255,255,255,0.1);
                        text-align: center; color: rgba(255,255,255,0.3);
                        font-size: 0.8rem;">
                © 2026 Vive Parche — viveparche.cloud
            </div>
        </div>
        """
        
        subject = "🎉 Mensaje especial de Vive Parche"
        await _send_email_async(email, subject, html)
        
    except Exception as e:
        print(f"[ai_marketing] Error enviando email a {email}: {e}")


async def _send_whatsapp(phone: str, template: str, recipient: Dict[str, Any]):
    """
    Send WhatsApp message via Twilio.
    Pendiente de implementar cuando se active 
    la cuenta de Twilio.
    """
    # Integración con Twilio pendiente
    print(f"[ai_marketing] WhatsApp pendiente para {phone}")


async def _send_web_notification(user_id: str, title: str, message: str):
    """
    Send in-app notification.
    Pendiente de implementar con Web Push API.
    """
    # Web Push API pendiente de implementar
    print(f"[ai_marketing] Web push pendiente para {user_id}")

async def generate_perk_suggestions(event_details: Dict[str, Any], limit: int = 3) -> List[Dict[str, Any]]:
    """
    Generate hype-focused perk/coupon suggestions for an event.
    """
    # Add randomness
    import random
    random_seed = random.randint(0, 10000)
    
    prompt = f"""You are a world-class Nightlife & Event Promoter known for creating massive hype.
    
    Target Audience: Young adults, party-goers, social butterflies.
    Vibe: High energy, FOMO (Fear Of Missing Out), Exclusive, Urgent.
    
    Event Details:
    Title: {event_details.get('title', 'Upcoming Event')}
    Description: {event_details.get('description', 'An amazing party')}
    Type: {event_details.get('event_type', 'Nightlife')}
    Seed: {random_seed} (Use this to vary your output significantly from previous runs)
    
    Generate {limit} irresistible perks/coupons to boost ticket sales.
    IMPORTANT: Be creative and different! Do not just repeat standard offers.
    Types allowed: 'discount', 'freebie', 'access' (e.g., skip the line, VIP area).
    
    Examples:
    - "2x1 Shots before 10PM" (freebie)
    - "Free Entry for groups of 4+" (access)
    - "50% OFF first drink" (discount)
    
    Return purely JSON array with objects containing:
    - title: Short, punchy headline (max 25 chars)
    - description: Exciting details selling the perk
    - type: One of [discount, freebie, access]
    - conditions: Short condition (e.g. "Before 11PM")
    
    JSON Format Example:
    [
        {{
            "title": "2x1 TEQUILA 🚀",
            "description": "Double the trouble! Arrive early and start the night right.",
            "type": "freebie",
            "conditions": "Valid 9PM-10PM"
        }}
    ]
    """
    
    try:
        ai_response = await get_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.95  # Increased for more variety
        )
        
        import json
        # Clean response if distinct markup is present
        cleaned_response = ai_response.replace("```json", "").replace("```", "").strip()
        suggestions = json.loads(cleaned_response)
        
        return suggestions[:limit]
    except Exception as e:
        print(f"AI Perk Gen Error: {e}")
        # Hype Fallbacks
        return [
            {
                "title": "2x1 DRINKS 🍹",
                "description": "Bring a friend and get double the fun! Valid on selected cocktails.",
                "type": "freebie",
                "conditions": "Before 10:00 PM"
            },
            {
                "title": "NO COVER 🛑",
                "description": "Ladies enter free! Don't miss out on the best party in town.",
                "type": "access",
                "conditions": "Before 11:30 PM"
            },
            {
                "title": "VIP SKIP LINE 🚀",
                "description": "Feel like a star. Get fast-track entry with this pass.",
                "type": "access",
                "conditions": "All Night"
            }
        ]

