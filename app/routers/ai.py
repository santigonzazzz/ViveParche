"""
AI router for VibeMap AI.
API endpoints for AI chat functionality.
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.models.ai import ChatRequest, ChatResponse
from app.services import supabase_service, openai_service
from app.services import vibe_search_service

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with AI about an event",
)
async def chat_about_event(chat_request: ChatRequest):
    """
    Answer questions about an event using AI.
    Fetches event details and provides expert answers.
    """
    try:
        event_description = ""
        event_title = "VibeMap Assistant"

        # Fetch event from database if event_id is provided
        if chat_request.event_id:
            event = await supabase_service.get_event_by_id(chat_request.event_id)
            if not event:
                 # If specific event requested but not found, warn but continue? or error?
                 # Let's error for now to match previous logic if ID was explicitly sent
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Event with ID {chat_request.event_id} not found",
                )
            event_description = event.get("description", "")
            event_title = event.get("title", "")

        # Get AI answer using event description (or general context)
        # We might need to update openai_service.get_event_answer to handle empty description too
        # passing a "General Assistant" context if description is empty.
        
        system_context = f"You are VibeSeeker AI. Context: {event_description}" if event_description else "You are VibeSeeker AI, an expert on city events and vibes."

        answer = await openai_service.get_event_answer(
            event_description=system_context, 
            user_question=chat_request.user_question,
        )

        return ChatResponse(event_title=event_title, answer=answer)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process AI chat: {str(e)}",
        )


class VibeSearchRequest(BaseModel):
    query: str


@router.post(
    "/vibe-search",
    summary="AI-powered vibe search across all events and venues",
)
async def vibe_search(request: VibeSearchRequest):
    """
    Natural language vibe search. The AI understands the user's intent, mood,
    and desired experience, then returns the best matching events and venues.
    
    Example queries:
    - "I need a cozy spot for a first date"
    - "An unusual underground event that's not mainstream"
    - "Best place to celebrate a birthday with friends"
    """
    try:
        if not request.query or not request.query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query cannot be empty"
            )
        
        result = await vibe_search_service.vibe_search(request.query.strip())
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Vibe search error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vibe search failed: {str(e)}",
        )
