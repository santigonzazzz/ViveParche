"""
Chat management router for VibeMap AI Business Dashboard.
Handles live chat conversations, AI auto-replies, and AI Co-Pilot settings.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.services import chat_service, subscription_service
from app.dependencies import get_current_user
from app.middleware.security import require_business, rate_limit

router = APIRouter(prefix="/chat", tags=["Chat Management"])


# ─────────────────────────────────────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    message: str
    conversation_id: str


class CreateConversationRequest(BaseModel):
    customer_id: str
    category: str = "lead"


class StartCustomerConversationRequest(BaseModel):
    venue_id: str
    customer_id: str
    customer_name: Optional[str] = None
    event_context: Optional[Dict[str, Any]] = None


class CustomerMessageRequest(BaseModel):
    conversation_id: str
    customer_id: str
    message: str


class ToggleAIRequest(BaseModel):
    enabled: bool


class AISettingsRequest(BaseModel):
    tone: str = "professional"  # professional | vibey | energetic
    custom_instructions: str = ""
    automation_level: int = 80  # 0-100


# ─────────────────────────────────────────────────────────────────────────────
# Public Customer Endpoints (no auth required)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/customer/start")
@rate_limit(max_requests=20, window_seconds=60)
async def start_customer_conversation(
    http_request: Request,
    request: StartCustomerConversationRequest
) -> Dict[str, Any]:
    """
    Start a conversation between a customer and a venue.
    Public endpoint — no authentication required.
    The AI will send a welcome message automatically.
    """
    try:
        conversation = await chat_service.start_customer_conversation(
            venue_id=request.venue_id,
            customer_id=request.customer_id,
            customer_name=request.customer_name,
            event_context=request.event_context
        )
        return conversation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/customer/message")
@rate_limit(max_requests=30, window_seconds=60)
async def send_customer_message(
    http_request: Request,
    request: CustomerMessageRequest
) -> Dict[str, Any]:
    """
    Send a customer message and get an AI reply.
    Public endpoint — no authentication required.
    Returns both the saved customer message and the AI reply.
    """
    try:
        result = await chat_service.handle_customer_message(
            conversation_id=request.conversation_id,
            customer_id=request.customer_id,
            message=request.message
        )
        return result
    except Exception as e:
        print(f"DEBUG CHAT ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Chat Error: {str(e)}")


@router.get("/customer/messages/{conversation_id}")
@rate_limit(max_requests=60, window_seconds=60)
async def get_customer_messages(
    http_request: Request,
    conversation_id: str,
    customer_id: str,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Get messages for a customer conversation.
    Public endpoint — customer_id is used to verify ownership.
    """
    try:
        messages = await chat_service.get_conversation_messages(
            conversation_id=conversation_id,
            limit=limit
        )
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Owner/Staff Endpoints (auth required)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversations")
@rate_limit(max_requests=50, window_seconds=60)
async def get_conversations(
    filter_type: str = "all",
    venue_id: Optional[str] = Query(None),
    limit: int = 50,
    offset: int = 0,
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Get chat conversations for the store."""
    try:
        # If admin provides venue_id, we use it for context
        if user.get("role") == "admin" and venue_id:
            owner_id = await chat_service.get_venue_owner(venue_id)
        else:
            owner_id = user.get("context_owner_id", user["id"])

        has_chat = await subscription_service.has_feature_access(owner_id, "chat_management")
        is_owner = user.get("role") == "owner"
        is_worker = user.get("role") == "worker"
        is_admin = user.get("role") == "admin"

        if not (has_chat or is_owner or is_worker or is_admin):
            raise HTTPException(
                status_code=403,
                detail="Chat management requires a Pro or Premium plan"
            )

        print(f"DEBUG: Router get_conversations for owner_id: {owner_id}, venue_id: {venue_id}")
        conversations = await chat_service.get_conversations(
            store_id=owner_id,
            venue_id=venue_id if user.get("role") == "admin" else user.get("context_venue_id"),
            filter_type=filter_type,
            limit=limit,
            offset=offset
        )

        return {"conversations": conversations}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/conversations/{conversation_id}/messages")
@rate_limit(max_requests=100, window_seconds=60)
async def get_conversation_messages(
    conversation_id: str,
    limit: int = 100,
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Get messages for a specific conversation (owner/staff view)."""
    try:
        messages = await chat_service.get_conversation_messages(
            conversation_id=conversation_id,
            limit=limit
        )
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/conversations/{conversation_id}/messages")
@rate_limit(max_requests=100, window_seconds=60)
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Send a message as staff/owner in a conversation."""
    try:
        owner_id = user.get("context_owner_id", user["id"])

        message = await chat_service.send_message(
            conversation_id=conversation_id,
            sender_id=user["id"],
            sender_type="staff",
            message=request.message,
            store_id=owner_id
        )

        return message
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/conversations")
@rate_limit(max_requests=50, window_seconds=60)
async def create_conversation(
    request: CreateConversationRequest,
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Create or get existing conversation with a customer."""
    try:
        owner_id = user.get("context_owner_id", user["id"])

        conversation = await chat_service.create_or_update_conversation(
            customer_id=request.customer_id,
            store_id=owner_id,
            category=request.category
        )

        return conversation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/conversations/{conversation_id}/ai-toggle")
@rate_limit(max_requests=30, window_seconds=60)
async def toggle_ai(
    conversation_id: str,
    request: ToggleAIRequest,
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """
    Toggle AI auto-reply for a specific conversation.
    When disabled, the owner/staff takes over manually.
    """
    try:
        owner_id = user.get("context_owner_id", user["id"])

        result = await chat_service.toggle_ai_for_conversation(
            conversation_id=conversation_id,
            store_id=owner_id,
            enabled=request.enabled
        )

        return {
            "success": True,
            "ai_enabled": result.get("ai_enabled"),
            "conversation_id": conversation_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# AI Co-Pilot Settings
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ai-settings")
@rate_limit(max_requests=30, window_seconds=60)
async def get_ai_settings(
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Get AI Co-Pilot settings for the current owner."""
    try:
        owner_id = user.get("context_owner_id", user["id"])
        settings_data = await chat_service.get_venue_ai_settings(owner_id)
        return settings_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/ai-settings")
@rate_limit(max_requests=20, window_seconds=60)
async def save_ai_settings(
    request: AISettingsRequest,
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Save AI Co-Pilot settings for the current owner."""
    try:
        owner_id = user.get("context_owner_id", user["id"])

        # Validate tone
        valid_tones = ["professional", "vibey", "energetic"]
        if request.tone not in valid_tones:
            raise HTTPException(status_code=400, detail=f"Invalid tone. Must be one of: {valid_tones}")

        # Validate automation level
        if not (0 <= request.automation_level <= 100):
            raise HTTPException(status_code=400, detail="automation_level must be between 0 and 100")

        result = await chat_service.save_venue_ai_settings(
            owner_id=owner_id,
            tone=request.tone,
            custom_instructions=request.custom_instructions,
            automation_level=request.automation_level
        )

        return {"success": True, "settings": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Promo & Statistics
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/conversations/{conversation_id}/promo-suggestion")
@rate_limit(max_requests=10, window_seconds=60)
async def generate_promo_suggestion(
    conversation_id: str,
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """AI Copilot: Generate a personalized promo code suggestion based on conversation."""
    try:
        has_ai = await subscription_service.has_feature_access(user["id"], "ai_suggestions")

        if not has_ai:
            raise HTTPException(
                status_code=403,
                detail="AI promo suggestions require a Pro or Premium plan"
            )

        suggestion = await chat_service.generate_promo_suggestion(
            conversation_id=conversation_id,
            store_id=user["id"]
        )

        return suggestion
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/statistics")
async def get_chat_statistics(
    venue_id: Optional[str] = Query(None),
    user=Depends(get_current_user),
    _=Depends(require_business)
) -> Dict[str, Any]:
    """Get chat statistics for analytics."""
    try:
        if user.get("role") == "admin" and venue_id:
            owner_id = await chat_service.get_venue_owner(venue_id)
        else:
            owner_id = user.get("context_owner_id", user["id"])
            venue_id = user.get("context_venue_id")

        stats = await chat_service.get_chat_statistics(owner_id, venue_id=venue_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
