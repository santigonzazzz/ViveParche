"""
Subscription service for VibeMap AI Business Dashboard.
Handles plan management, feature access, and billing.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from uuid import UUID
from supabase import Client
from app.services.supabase_service import supabase_admin as admin_client
from app.config import settings

# Use admin client (always initialized in production)
def get_db_client() -> Client:
    return admin_client


async def create_subscription(
    user_id: str,
    plan_type: str,
    payment_method_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new subscription for a user.
    
    Args:
        user_id: User ID
        plan_type: Plan type (basic, pro, premium)
        payment_method_id: Payment method identifier
    
    Returns:
        Subscription data
    """
    if plan_type not in settings.subscription_plans:
        raise Exception(f"Invalid plan type: {plan_type}")
    
    plan = settings.subscription_plans[plan_type]
    
    # Calculate expiration (monthly)
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    subscription_data = {
        "user_id": user_id,
        "plan_type": plan_type,
        "status": "active",
        "price": plan["price"],
        "currency": plan["currency"],
        "features": plan["features"],
        "limits": plan["limits"],
        "expires_at": expires_at.isoformat()
    }
    
    # Cancel any existing active subscriptions
    get_db_client().table("subscriptions") \
        .update({"status": "cancelled"}) \
        .eq("user_id", user_id) \
        .eq("status", "active") \
        .execute()
    
    # Create new subscription
    result = get_db_client().table("subscriptions").insert(subscription_data).execute()
    
    if not result.data:
        raise Exception("Failed to create subscription")
    
    # Update user role to owner if not already
    get_db_client().table("profiles") \
        .update({"role": "owner"}) \
        .eq("id", user_id) \
        .execute()
    
    return result.data[0]


async def get_active_subscription(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user's active subscription.
    
    Args:
        user_id: User ID
    
    Returns:
        Subscription data or None
    """
    result = get_db_client().table("subscriptions") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("status", "active") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if result.data:
        subscription = result.data[0]
        
        # Check if expired (guard against null expires_at for manually-managed plans)
        raw_expires = subscription.get("expires_at")
        if raw_expires:
            try:
                expires_at = datetime.fromisoformat(raw_expires.replace('Z', '+00:00'))
                if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
                    # Mark as expired
                    get_db_client().table("subscriptions") \
                        .update({"status": "expired"}) \
                        .eq("id", subscription["id"]) \
                        .execute()
                    return None
            except (ValueError, AttributeError):
                # If the date is malformed, we assume the subscription is still active
                pass
        # If expires_at is null, the plan has no expiration (e.g., admin-granted plans)
        
        return subscription
    
    return None


async def has_feature_access(user_id: str, feature: str) -> bool:
    """
    Check if user has access to a specific feature.
    
    Args:
        user_id: User ID
        feature: Feature name
    
    Returns:
        True if user has access
    """
    subscription = await get_active_subscription(user_id)
    
    if not subscription:
        return False
    
    features = subscription.get("features", {})
    return features.get(feature, False)


async def check_limit(user_id: str, limit_type: str, current_count: int) -> bool:
    """
    Check if user is within their plan limits.
    
    Args:
        user_id: User ID
        limit_type: Type of limit (events_per_month, team_members)
        current_count: Current usage count
    
    Returns:
        True if within limits
    """
    subscription = await get_active_subscription(user_id)
    
    if not subscription:
        return False
    
    limits = subscription.get("limits", {})
    limit = limits.get(limit_type, 0)
    
    # -1 means unlimited
    if limit == -1:
        return True
    
    return current_count < limit


async def upgrade_subscription(user_id: str, new_plan_type: str) -> Dict[str, Any]:
    """
    Upgrade user's subscription to a higher plan.
    
    Args:
        user_id: User ID
        new_plan_type: New plan type
    
    Returns:
        Updated subscription
    """
    current_sub = await get_active_subscription(user_id)
    
    if not current_sub:
        return await create_subscription(user_id, new_plan_type)
    
    current_plan = current_sub["plan_type"]
    plan_hierarchy = {"basic": 1, "pro": 2, "premium": 3}
    
    if plan_hierarchy.get(new_plan_type, 0) <= plan_hierarchy.get(current_plan, 0):
        raise Exception("Can only upgrade to a higher plan")
    
    # Create new subscription
    return await create_subscription(user_id, new_plan_type)


async def cancel_subscription(user_id: str) -> Dict[str, Any]:
    """
    Cancel user's active subscription.
    
    Args:
        user_id: User ID
    
    Returns:
        Cancelled subscription data
    """
    result = get_db_client().table("subscriptions") \
        .update({"status": "cancelled"}) \
        .eq("user_id", user_id) \
        .eq("status", "active") \
        .execute()
    
    if not result.data:
        raise Exception("No active subscription found")
    
    return result.data[0]


async def get_subscription_stats(user_id: str) -> Dict[str, Any]:
    """
    Get subscription usage statistics.
    
    Args:
        user_id: User ID
    
    Returns:
        Usage stats
    """
    subscription = await get_active_subscription(user_id)
    
    if not subscription:
        return {
            "has_subscription": False,
            "plan_type": None,
            "usage": {}
        }
    
    # Get current month's event count
    from datetime import datetime, timedelta
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    events_result = get_db_client().table("events") \
        .select("id", count="exact") \
        .eq("owner_id", user_id) \
        .gte("created_at", month_start.isoformat()) \
        .execute()
    
    events_count = events_result.count or 0
    
    # Get team members count
    team_result = get_db_client().table("team_members") \
        .select("id", count="exact") \
        .eq("store_id", user_id) \
        .eq("accepted", True) \
        .execute()
    
    team_count = team_result.count or 0
    
    limits = subscription.get("limits", {})
    
    return {
        "has_subscription": True,
        "plan_type": subscription["plan_type"],
        "expires_at": subscription["expires_at"],
        "usage": {
            "events_this_month": events_count,
            "events_limit": limits.get("events_per_month", 0),
            "team_members": team_count,
            "team_members_limit": limits.get("team_members", 0)
        }
    }
