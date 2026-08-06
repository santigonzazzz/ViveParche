"""
Business Dashboard router for VibeMap AI.
Main dashboard analytics, metrics, AI marketing, and team management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from app.services import (
    analytics_service, ai_marketing_service,
    subscription_service, business_service, team_service
)
from app.dependencies import get_current_user, require_role
from app.middleware.security import require_business, require_owner, rate_limit
from app.models.team import TeamInvitationCreate, TeamJoinRequest

router = APIRouter(prefix="/business", tags=["Business Dashboard"])


# =====================================================
# MAIN DASHBOARD
# =====================================================

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    venue_id: Optional[str] = None,
    user=Depends(require_business)
) -> Dict[str, Any]:
    """
    Get main dashboard summary metrics (venue-based):
    Total Parceros, Ingresos Totales (COP), Calificación Promedio, Nivel de Plan.
    """
    try:
        owner_id = user.get("context_owner_id", user["id"])
        summary = await analytics_service.get_dashboard_summary(owner_id, venue_id=venue_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(require_business)):
    """Legacy endpoint - fetch main dashboard metrics for the store owner."""
    try:
        owner_id = user.get("context_owner_id", user["id"])
        return await business_service.get_owner_dashboard(owner_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard/sales-chart")
@rate_limit(max_requests=30, window_seconds=60)
async def get_sales_chart(
    period: str = "week",
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Legacy sales chart endpoint."""
    try:
        if period not in ["week", "month"]:
            raise Exception("Invalid period. Must be 'week' or 'month'")
        owner_id = user.get("context_owner_id", user["id"])
        chart_data = await analytics_service.get_sales_chart(owner_id, period)
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard/traffic-chart")
@rate_limit(max_requests=30, window_seconds=60)
async def get_traffic_chart(
    period: str = "week",
    venue_id: Optional[str] = None,
    user=Depends(require_business)
) -> Dict[str, Any]:
    """
    Traffic by hour-slot chart for the venue dashboard.
    Returns 5 time slots (6am-10am, 10am-2pm, 2pm-8pm, 8pm-12am, 12am-6am)
    with average view counts per slot over the requested period.
    """
    try:
        if period not in ["week", "month"]:
            raise Exception("Invalid period. Must be 'week' or 'month'")
        owner_id = user.get("context_owner_id", user["id"])
        chart_data = await analytics_service.get_traffic_chart(owner_id, period, venue_id=venue_id)
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================================================
# AI MARKETING
# =====================================================

@router.get("/ai-suggestions")
@rate_limit(max_requests=10, window_seconds=60)
async def get_ai_suggestions(
    limit: int = 2,
    user=Depends(require_owner)
) -> Dict[str, Any]:
    """
    Get AI-generated marketing suggestions.
    
    Args:
        limit: Number of suggestions (default 2)
    
    Returns:
        List of AI suggestions with context
    """
    try:
        owner_id = user.get("context_owner_id", user["id"])
        # Check if user has AI features
        has_ai = await subscription_service.has_feature_access(owner_id, "ai_suggestions")
        
        if not has_ai:
            # Fallback to mock suggestions to keep the UI design working
            return {
                "suggestions": [
                    {
                        "id": "mock_1",
                        "title": "Boost Social Buzz",
                        "description": "Increase your event's visibility by sharing highlights on Instagram Reels.",
                        "type": "social_media"
                    },
                    {
                        "id": "mock_2",
                        "title": "Early Bird Promo",
                        "description": "Offer a 10% discount to users who buy tickets in the first 24 hours.",
                        "type": "marketing"
                    }
                ],
                "mocked": True,
                "note": "Upgrade to Pro for real AI-generated insights based on your event data."
            }
        
        suggestions = await ai_marketing_service.generate_suggestions(owner_id, limit)
        return {"suggestions": suggestions}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard/ai-copilot")
async def get_ai_copilot(user=Depends(require_owner)):
    """Legacy endpoint - Get AI-generated marketing suggestions."""
    try:
        owner_id = user.get("context_owner_id", user["id"])
        return await business_service.get_ai_suggestions(owner_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai-suggestions/{suggestion_id}/send")
@rate_limit(max_requests=5, window_seconds=60)
async def send_ai_campaign(
    suggestion_id: str,
    user=Depends(require_owner)
) -> Dict[str, Any]:
    """
    Send an AI marketing campaign to customers.
    
    Sends via:
    - Email
    - WhatsApp
    - Web notifications
    
    Args:
        suggestion_id: Campaign/suggestion ID
    
    Returns:
        Send results and metrics
    """
    try:
        owner_id = user.get("context_owner_id", user["id"])
        # Check AI feature access
        has_ai = await subscription_service.has_feature_access(owner_id, "ai_suggestions")
        
        if not has_ai and not suggestion_id.startswith("mock_"):
            raise HTTPException(
                status_code=403,
                detail="AI campaigns require a Pro or Premium plan"
            )
        
        if suggestion_id.startswith("mock_"):
            return {
                "success": True,
                "message": "Campaign sent successfully (MOCK)",
                "result": "success"
            }
            
        result = await ai_marketing_service.send_campaign(suggestion_id, owner_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/dashboard/campaign/send/{campaign_id}")
async def send_campaign(campaign_id: str, user=Depends(require_owner)):
    """Legacy endpoint - Execute an AI recommendation campaign."""
    try:
        owner_id = user.get("context_owner_id", user["id"])
        return await business_service.execute_campaign(owner_id, campaign_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================================================
# SUBSCRIPTION
# =====================================================

@router.get("/subscription")
async def get_subscription_info(
    user=Depends(require_owner)
) -> Dict[str, Any]:
    """
    Get current subscription information and usage stats.
    
    Returns:
        Plan type, expiry, usage limits
    """
    try:
        owner_id = user.get("context_owner_id", user["id"])
        stats = await subscription_service.get_subscription_stats(owner_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================================================
# EVENTS
# =====================================================

@router.get("/events")
async def get_owner_events(
    user=Depends(require_business)
):
    """Retrieve all events owned by the current user."""
    try:
        from app.services import supabase_service
        owner_id = user.get("context_owner_id", user["id"])
        events = await supabase_service.get_events_by_owner(owner_id)
        return events
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/events/{event_id}")
async def get_event_detail(
    event_id: str,
    user=Depends(require_business)
):
    """Retrieve details for a specific event if owned by user."""
    try:
        from app.services import supabase_service
        event = await supabase_service.get_event_by_id(event_id)
        owner_id = user.get("context_owner_id", user["id"])
        if not event or str(event.get("owner_id")) != str(owner_id):
            raise Exception("Event not found or access denied")
        return event
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Team management now handled exclusively in team.py


# =====================================================
# ANALYTICS
# =====================================================

@router.get("/analytics/events")
async def get_event_analytics(
    event_id: Optional[str] = None,
    user=Depends(require_business)
):
    """Get analytics for a specific event."""
    try:
        owner_id = user.get("context_owner_id", user["id"])
        if event_id:
            return await analytics_service.get_event_analytics(owner_id, event_id)
        else:
            return await business_service.get_event_analytics(owner_id, event_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
