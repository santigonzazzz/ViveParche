"""
Notification service for VibeMap AI Business Dashboard.
Manages notification preferences and multi-channel delivery.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import UUID
from app.services.supabase_service import supabase_admin as admin_client
from app.services.email_service import _send_email_async


async def get_preferences(user_id: str) -> Dict[str, Any]:
    """
    Get notification preferences for a user.
    
    Args:
        user_id: User ID
    
    Returns:
        Notification preferences
    """
    result = admin_client.table("notification_preferences") \
        .select("*") \
        .eq("user_id", user_id) \
        .execute()
    
    if result.data:
        return result.data[0]
    
    # Create default preferences
    return await create_default_preferences(user_id)


async def create_default_preferences(user_id: str) -> Dict[str, Any]:
    """Create default notification preferences for a user"""
    default_prefs = {
        "user_id": user_id,
        "new_messages": True,
        "bookings": True,
        "daily_summary": True,
        "ai_suggestions": True,
        "email_enabled": True,
        "web_enabled": True
    }
    
    result = admin_client.table("notification_preferences").insert(default_prefs).execute()
    
    return result.data[0] if result.data else default_prefs


async def update_preferences(user_id: str, preferences: Dict[str, bool]) -> Dict[str, Any]:
    """
    Update notification preferences.
    
    Args:
        user_id: User ID
        preferences: Preference updates
    
    Returns:
        Updated preferences
    """
    # Ensure user has preferences
    await get_preferences(user_id)
    
    result = admin_client.table("notification_preferences") \
        .update(preferences) \
        .eq("user_id", user_id) \
        .execute()
    
    if not result.data:
        raise Exception("Failed to update preferences")
    
    return result.data[0]


async def should_notify(user_id: str, notification_type: str, channel: str = "email") -> bool:
    """
    Check if user should receive a specific notification.
    
    Args:
        user_id: User ID
        notification_type: Type (new_messages, bookings, daily_summary, ai_suggestions)
        channel: Channel (email, web)
    
    Returns:
        True if should notify
    """
    prefs = await get_preferences(user_id)
    
    # Check if type is enabled
    type_enabled = prefs.get(notification_type, False)
    
    # Check if channel is enabled
    channel_key = f"{channel}_enabled"
    channel_enabled = prefs.get(channel_key, False)
    
    return type_enabled and channel_enabled


async def send_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send a notification through enabled channels.
    
    Args:
        user_id: User ID
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        data: Additional data
    
    Returns:
        Send status
    """
    results = {
        "email": False,
        "web": False
    }
    
    # Check email
    if await should_notify(user_id, notification_type, "email"):
        results["email"] = await _send_email_notification(user_id, title, message, data)
    
    # Check web
    if await should_notify(user_id, notification_type, "web"):
        results["web"] = await _send_web_notification(user_id, title, message, data)
    
    return results


async def _send_email_notification(
    user_id: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]]
) -> bool:
    """Send real email notification via Gmail SMTP"""
    try:
        user_result = admin_client.table("profiles") \
            .select("email, full_name") \
            .eq("id", user_id) \
            .execute()
        
        if not user_result.data:
            return False
        
        user = user_result.data[0]
        email = user.get("email")
        full_name = user.get("full_name", "Usuario")
        
        if not email:
            return False

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; 
                    background: #0a0a0f; color: white; padding: 2rem; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h1 style="color: #9333ea; margin: 0;">Vive Parche</h1>
            </div>
            <h2 style="color: white; margin-bottom: 1rem;">{title}</h2>
            <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
                Hola {full_name},
            </p>
            <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
                {message}
            </p>
            <div style="margin-top: 2rem; padding-top: 1rem; 
                        border-top: 1px solid rgba(255,255,255,0.1);
                        text-align: center; color: rgba(255,255,255,0.3); 
                        font-size: 0.8rem;">
                © 2026 Vive Parche — viveparche.cloud
            </div>
        </div>
        """
        
        success = await _send_email_async(email, title, html)
        return success
        
    except Exception as e:
        print(f"[notification_service] Error enviando email a {user_id}: {e}")
        return False


async def _send_web_notification(
    user_id: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]]
) -> bool:
    """
    Send web push notification.
    Pendiente de implementar con Web Push API.
    """
    # Web Push API pendiente de implementar
    print(f"[notification_service] Web push pendiente para {user_id}")
    return True


async def notify_new_message(store_id: str, customer_name: str, message_preview: str):
    """Send notification for new chat message"""
    await send_notification(
        user_id=store_id,
        notification_type="new_messages",
        title="New Message",
        message=f"{customer_name}: {message_preview[:50]}...",
        data={"type": "chat_message"}
    )


async def notify_new_booking(store_id: str, event_name: str, quantity: int):
    """Send notification for new ticket booking"""
    await send_notification(
        user_id=store_id,
        notification_type="bookings",
        title="New Booking!",
        message=f"{quantity} ticket(s) purchased for {event_name}",
        data={"type": "booking"}
    )


async def notify_ai_suggestion(store_id: str, suggestion_title: str):
    """Send notification for AI marketing suggestion"""
    await send_notification(
        user_id=store_id,
        notification_type="ai_suggestions",
        title="AI Marketing Suggestion",
        message=suggestion_title,
        data={"type": "ai_suggestion"}
    )


async def send_daily_summary(store_id: str, summary_data: Dict[str, Any]):
    """Send daily summary notification"""
    message = f"""Daily Summary:
- New bookings: {summary_data.get('new_bookings', 0)}
- Revenue: ${summary_data.get('revenue', 0):,.2f}
- New messages: {summary_data.get('new_messages', 0)}
"""
    
    await send_notification(
        user_id=store_id,
        notification_type="daily_summary",
        title="Your Daily Summary",
        message=message,
        data=summary_data
    )
