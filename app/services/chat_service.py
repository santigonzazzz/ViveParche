"""
Chat service for VibeMap AI Business Dashboard.
Manages conversations, messages, AI auto-replies, and AI settings.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import UUID
from app.services.openai_service import get_chat_completion, get_venue_chat_reply
from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
from app.services.settings_service import create_notification
import re

def is_valid_uuid(val: str) -> bool:
    """Check if a string is a valid UUID."""
    if not val:
        return False
    uuid_regex = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
    return bool(uuid_regex.match(val))


# ─────────────────────────────────────────────────────────────────────────────
# Conversation Management
# ─────────────────────────────────────────────────────────────────────────────

async def get_conversations(
    store_id: str,
    venue_id: Optional[str] = None,
    filter_type: str = "all",
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get chat conversations for a store."""
    # print(f"DEBUG: Fetching conversations for store_id: {store_id}, venue_id: {venue_id}")
    try:
        query = admin_client.table("chat_conversations") \
            .select("*")
        
        if venue_id:
            query = query.eq("venue_id", str(venue_id))
        else:
            query = query.eq("store_id", str(store_id))

        if filter_type == "leads":
            query = query.eq("category", "lead")
        elif filter_type == "guests":
            query = query.eq("category", "guest")
        elif filter_type == "alerts":
            query = query.eq("category", "alert")

        query = query.order("updated_at", desc=True) \
            .range(offset, offset + limit - 1)
        
        result = query.execute()
        # print(f"DEBUG: Found {len(result.data) if result.data else 0} conversations")
        return result.data or []
    except Exception as e:
        print(f"DEBUG ERROR in get_conversations: {str(e)}")
        return []


async def get_conversation_messages(
    conversation_id: str,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get messages for a specific conversation."""
    result = admin_client.table("chat_messages") \
        .select("*") \
        .eq("conversation_id", conversation_id) \
        .order("created_at") \
        .limit(limit) \
        .execute()
    return result.data or []


async def send_message(
    conversation_id: str,
    sender_id: str,
    sender_type: str,
    message: str,
    store_id: str
) -> Dict[str, Any]:
    """Send a message in a conversation (staff/owner use)."""
    sentiment = await _analyze_sentiment(message)

    message_data = {
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "sender_type": sender_type,
        "store_id": store_id,
        "message": message,
        "sentiment": sentiment
    }

    result = admin_client.table("chat_messages").insert(message_data).execute()

    if not result.data:
        raise Exception("Failed to send message")

    admin_client.table("chat_conversations") \
        .update({
            "last_message": message[:100],
            "updated_at": datetime.utcnow().isoformat(),
            "sentiment": sentiment,
            "ai_enabled": False  # AI TAKEOVER: Disable AI when staff replies
        }) \
        .eq("id", conversation_id) \
        .execute()

    return result.data[0]


async def create_or_update_conversation(
    customer_id: str,
    store_id: str,
    category: str = "lead",
    venue_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new conversation or get existing one."""
    existing = admin_client.table("chat_conversations") \
        .select("*") \
        .eq("customer_id", customer_id) \
        .eq("store_id", store_id) \
        .execute()

    if existing.data:
        return existing.data[0]

    conversation_data: Dict[str, Any] = {
        "customer_id": customer_id,
        "store_id": store_id,
        "category": category,
        "ai_enabled": True,
    }
    if venue_id:
        conversation_data["venue_id"] = venue_id

    result = admin_client.table("chat_conversations").insert(conversation_data).execute()

    if not result.data:
        raise Exception("Failed to create conversation")

    return result.data[0]


async def get_venue_owner(venue_id: str) -> str:
    """Helper to get owner_id of a venue."""
    res = admin_client.table("venues").select("owner_id").eq("id", venue_id).single().execute()
    if res.data:
        return res.data["owner_id"]
    raise Exception(f"Venue {venue_id} not found")


# ─────────────────────────────────────────────────────────────────────────────
# Customer Chat (Public - no auth required)
# ─────────────────────────────────────────────────────────────────────────────

async def start_customer_conversation(
    venue_id: str,
    customer_id: str,
    customer_name: Optional[str] = None,
    event_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create or get an existing conversation for a customer chatting with a venue.
    The venue_id maps to a place (store). We use the place owner as store_id.
    """
    # Get the venue owner
    print(f"DEBUG: Starting conversation for venue_id: {venue_id}, customer_id: {customer_id}")
    
    # Validate UUIDs to prevent 400 errors from Postgres
    try:
        if venue_id: UUID(str(venue_id))
        if customer_id: UUID(str(customer_id))
    except (ValueError, TypeError) as e:
        print(f"DEBUG ERROR: Invalid UUID format: {str(e)}")
        raise Exception(f"Invalid ID format. Venue: {venue_id}, Customer: {customer_id}. Error: {str(e)}")

    place_result = admin_client.table("venues") \
        .select("id, owner_id, name") \
        .eq("id", str(venue_id)) \
        .execute()

    if not place_result.data:
        print(f"DEBUG ERROR: Venue not found: {venue_id}")
        raise Exception(f"Venue not found: {venue_id}")

    place = place_result.data[0]
    store_id = place.get("owner_id")

    if not store_id:
        print(f"DEBUG ERROR: Venue '{place.get('name')}' has no owner")
        raise Exception(f"Venue '{place.get('name')}' has no owner configured yet.")

    # Check if conversation already exists for this customer + venue
    existing = admin_client.table("chat_conversations") \
        .select("*") \
        .eq("customer_id", customer_id) \
        .eq("store_id", store_id) \
        .eq("venue_id", venue_id) \
        .execute()

    if existing.data:
        return existing.data[0]

    # Create new conversation
    conversation_data: Dict[str, Any] = {
        "customer_id": customer_id,
        "store_id": store_id,
        "venue_id": venue_id,
        "category": "lead",
        "ai_enabled": True,
        "customer_name": customer_name or "Guest",
        "metadata": event_context if event_context else {}
    }

    result = admin_client.table("chat_conversations").insert(conversation_data).execute()

    if not result.data:
        raise Exception("Failed to create conversation")

    conv = result.data[0]

    # Send a welcome message from AI
    ai_settings = await get_venue_ai_settings(store_id)
    welcome_text = _generate_welcome_message(place["name"], ai_settings)
    await _save_ai_message(conv["id"], store_id, welcome_text)

    return conv


async def handle_customer_message(
    conversation_id: str,
    customer_id: str,
    message: str
) -> Dict[str, Any]:
    """
    Handle an incoming customer message:
    1. Save the customer message
    2. If AI is enabled, generate and save an AI reply
    3. Return both messages
    """
    # Get conversation details
    conv_result = admin_client.table("chat_conversations") \
        .select("*") \
        .eq("id", conversation_id) \
        .single() \
        .execute()

    if not conv_result.data:
        raise Exception("Conversation not found")

    conv = conv_result.data

    # Verify this customer owns this conversation
    if conv["customer_id"] != customer_id:
        raise Exception("Unauthorized")

    store_id = conv["store_id"]
    venue_id = conv.get("venue_id")
    ai_enabled = conv.get("ai_enabled", True)

    # Save customer message
    sentiment = await _analyze_sentiment(message)
    customer_msg_data = {
        "conversation_id": conversation_id,
        "sender_id": customer_id,
        "sender_type": "customer",
        "store_id": store_id,
        "message": message,
        "sentiment": sentiment
    }
    customer_msg_result = admin_client.table("chat_messages").insert(customer_msg_data).execute()
    customer_msg = customer_msg_result.data[0] if customer_msg_result.data else {}

    # Categorize: Check if customer is a lead or guest (has bookings)
    category = conv.get("category", "lead")
    try:
        # Check for any bookings for this customer
        # If customer_id is a valid UUID, check bookings
        if is_valid_uuid(customer_id):
            bookings_res = admin_client.table("bookings") \
                .select("id") \
                .eq("user_id", customer_id) \
                .limit(1) \
                .execute()
            
            if bookings_res.data:
                category = "guest"
            else:
                # If they were already an alert, don't downgrade to lead automatically
                if conv.get("category") != "alert":
                    category = "lead"
    except Exception as e:
        print(f"DEBUG: Category check error: {e}")

    # Update conversation
    admin_client.table("chat_conversations") \
        .update({
            "last_message": message[:100],
            "updated_at": datetime.utcnow().isoformat(),
            "sentiment": sentiment,
            "unread_count": (conv.get("unread_count") or 0) + 1,
            "category": category
        }) \
        .eq("id", conversation_id) \
        .execute()

    # ─── Notification & Alert Logic (Always runs, even if AI is disabled) ───
    is_alert = False
    human_keywords = ["talk to a human", "real person", "speak with staff", "agent", "human", "representative", "someone to help"]
    if any(kw in message.lower() for kw in human_keywords):
        is_alert = True

    # If already an alert, update category
    if is_alert:
        try:
            admin_client.table("chat_conversations") \
                .update({"category": "alert"}) \
                .eq("id", conversation_id) \
                .execute()
            
            await create_notification(
                user_id=store_id,
                ntype="alert",
                title="Attention Required!",
                message=f"A customer is asking for a human in a conversation.",
                link=f"/business/chat?id={conversation_id}"
            )
        except Exception as e:
            print(f"Failed to set alert category: {e}")

    # Standard "New Message" notification (only for the first unread message to avoid spam)
    if conv.get("unread_count", 0) == 0 and not is_alert:
        await create_notification(
            user_id=store_id,
            ntype="message",
            title="New Message",
            message=f"You have a new message from a customer.",
            link=f"/business/chat?id={conversation_id}"
        )

    ai_reply = None

    # Generate AI reply if enabled and venue_id is set
    if ai_enabled and venue_id:
        try:
            ai_reply = await _generate_ai_reply(
                conversation_id=conversation_id,
                venue_id=venue_id,
                store_id=store_id,
                customer_message=message
            )

            # AI-driven ALERT DETECTION (If AI suggests human contact)
            if ai_reply and ai_reply.get("message") and not is_alert:
                ai_lowered = ai_reply["message"].lower()
                alert_keywords = [
                    "contact us directly", "speak with a person", "reach out to us", 
                    "definitive answers", "staff members", "contact the store", 
                    "don't have that info", "not sure about that", "I don't know",
                    "cannot answer", "unable to provide", "ask the owner", "talk to venue"
                ]
                if any(kw in ai_lowered for kw in alert_keywords):
                    # Upgrade to alert if AI can't handle it
                    admin_client.table("chat_conversations") \
                        .update({"category": "alert"}) \
                        .eq("id", conversation_id) \
                        .execute()
                    
                    await create_notification(
                        user_id=store_id,
                        ntype="alert",
                        title="AI Needs Help",
                        message=f"The AI is referring a customer to you.",
                        link=f"/business/chat?id={conversation_id}"
                    )

        except Exception as e:
            print(f"AI reply error: {e}")

    return {
        "customer_message": customer_msg,
        "ai_reply": ai_reply
    }


async def _generate_ai_reply(
    conversation_id: str,
    venue_id: str,
    store_id: str,
    customer_message: str
) -> Optional[Dict[str, Any]]:
    """Generate and save an AI reply for a customer message."""
    # Get venue context from venues table
    place_result = admin_client.table("venues") \
        .select("name, description, address, vibe_tags, menu_url, menu_text, whatsapp_number, price_range, rating, opening_hours, special_offers_json, special_offers_pdf_url") \
        .eq("id", venue_id) \
        .single() \
        .execute()

    if not place_result.data:
        return None

    place = place_result.data

    # Formatting opening hours if they exist
    oh = place.get('opening_hours')
    oh_str = "N/A"
    if oh:
        oh_parts = []
        for day, h in oh.items():
            if h.get('closed'):
                oh_parts.append(f"{day.capitalize()}: CLOSED")
            else:
                oh_parts.append(f"{day.capitalize()}: {h.get('open', 'N/A')} - {h.get('close', 'N/A')}")
        oh_str = "\n".join(oh_parts)

    # Build venue context string using actual venues schema columns
    price_symbols = '$' * (place.get('price_range') or 2)
    has_menu = "Yes" if place.get('menu_url') else "No"
    
    # Build venue context string using actual venues schema columns
    price_symbols = '$' * (place.get('price_range') or 2)
    has_menu = "Yes" if place.get('menu_url') else "No"
    
    # Format special offers (from JSON, NOT from scaped PDF text)
    special_offers = "None"
    offers_list = place.get('special_offers_json') or []
    if offers_list:
        special_offers = "\n".join([f"- {o.get('name')}: {o.get('description')} ({o.get('price')})" for o in offers_list])
    
    if place.get('special_offers_pdf_url'):
        special_offers += "\n- Contamos con un PDF de OFERTAS ESPECIALES. (RECUERDA AL USUARIO que puede verlo haciendo clic en el botón 'Ver Ofertas Especiales', NO compartas links)"

    # Fetch Loyalty / Passport info
    loyalty_info = "No hay información de recompensas del pasaporte disponible."
    try:
        # Check for active stamp rewards
        stamps_res = supabase_admin.table("stamp_rewards").select("title, stamps_required").eq("venue_id", venue_id).eq("active", True).limit(1).execute()
        if stamps_res.data:
            s = stamps_res.data[0]
            loyalty_info = f"Programa de Pasaporte: El usuario gana una recompensa '{s['title']}' después de recolectar {s['stamps_required']} sellos visitando el local."
    except Exception as e:
        print(f"DEBUG: Failed to fetch loyalty info for AI: {e}")

    venue_context = f"""Name: {place.get('name', 'N/A')}
Description: {place.get('description', 'N/A')}
Address: {place.get('address', 'N/A')}
Vibe Tags: {', '.join(place.get('vibe_tags', []) or [])}
Price Range: {price_symbols}
Rating: {place.get('rating', 'N/A')}/5
WhatsApp: {place.get('whatsapp_number', 'N/A')}
Has PDF Menu: {has_menu} (DO NOT share direct URLs, tell users to use the "Ver Menú PDF" button)
Special Offers (Ground Truth):
{special_offers}
Passport Rewards (Gangazos/Recompensas):
{loyalty_info}
Opening Hours (Ground Truth):
{oh_str}""".strip()


    # If conversation has specific event context, add it too
    conv_res = admin_client.table("chat_conversations").select("metadata").eq("id", conversation_id).single().execute()
    if conv_res.data and conv_res.data.get("metadata"):
        ec = conv_res.data["metadata"]
        event_str = f"""
*** SPECIFIC EVENT CONTEXT (The user is looking at this event page) ***
Title: {ec.get('eventTitle', 'N/A')}
Description: {ec.get('eventDescription', 'N/A')}
Date: {ec.get('eventDate', 'N/A')}
Address: {ec.get('eventAddress', 'N/A')}
Price: {ec.get('eventPrice', 'N/A')}
***********************************************************************"""
        venue_context += "\n" + event_str.strip()

    # PROACTIVE KNOWLEDGE: Fetch all upcoming events for this venue
    try:
        now_iso = datetime.utcnow().isoformat()
        events_res = admin_client.table("events") \
            .select("title, event_date, description, price") \
            .eq("venue_id", venue_id) \
            .gt("event_date", now_iso) \
            .order("event_date") \
            .limit(5) \
            .execute()
        
        if events_res.data:
            upcoming_events_str = "\nUPCOMING EVENTS AT THIS VENUE:"
            for ev in events_res.data:
                upcoming_events_str += f"\n- {ev['title']} on {ev['event_date']} (Price: {ev.get('price', 'N/A')})"
            venue_context += "\n" + upcoming_events_str
    except Exception as e:
        print(f"DEBUG: Failed to fetch upcoming events for AI context: {str(e)}")

    # Get AI settings for this owner
    ai_settings = await get_venue_ai_settings(store_id)
    tone = ai_settings.get("tone", "professional")
    custom_instructions = ai_settings.get("custom_instructions", "")
    automation_level = ai_settings.get("automation_level", 80)

    # Get recent conversation history (last 10 messages)
    recent_messages = await get_conversation_messages(conversation_id, limit=20)
    history = []
    for msg in recent_messages[-10:]:
        role = "user" if msg["sender_type"] == "customer" else "assistant"
        history.append({"role": role, "content": msg["message"]})

    # Generate AI reply
    reply_text = await get_venue_chat_reply(
        venue_name=place.get("name", "the venue"),
        venue_context=venue_context,
        conversation_history=history,
        customer_message=customer_message,
        tone=tone,
        custom_instructions=custom_instructions,
        automation_level=automation_level
    )

    return await _save_ai_message(conversation_id, store_id, reply_text)


async def _save_ai_message(
    conversation_id: str,
    store_id: str,
    message_text: str
) -> Dict[str, Any]:
    """Save an AI-generated message to the database."""
    ai_msg_data = {
        "conversation_id": conversation_id,
        "sender_id": store_id,
        "sender_type": "ai",
        "store_id": store_id,
        "message": message_text,
        "sentiment": "positive"
    }
    result = admin_client.table("chat_messages").insert(ai_msg_data).execute()

    if result.data:
        admin_client.table("chat_conversations") \
            .update({
                "last_message": message_text[:100],
                "updated_at": datetime.utcnow().isoformat()
            }) \
            .eq("id", conversation_id) \
            .execute()
        return result.data[0]
    return {}


def _generate_welcome_message(venue_name: str, ai_settings: Dict) -> str:
    """Generate a welcome message for new conversations."""
    tone = ai_settings.get("tone", "professional")
    tone_intros = {
        "professional": f"¡Hola! Bienvenido/a a {venue_name}. ¿En qué te puedo ayudar hoy?",
        "vibey": f"¡Hola! 👋 ¡Bienvenido/a a {venue_name}! ¿Qué tienes en mente?",
        "energetic": f"¡Hola! 🎉 ¡Bienvenido a {venue_name}! ¡Qué bueno tenerte por acá! ¿En qué te podemos ayudar?!"
    }
    return tone_intros.get(tone, tone_intros["professional"])


# ─────────────────────────────────────────────────────────────────────────────
# AI Toggle (Owner Takeover)
# ─────────────────────────────────────────────────────────────────────────────

async def toggle_ai_for_conversation(
    conversation_id: str,
    store_id: str,
    enabled: bool
) -> Dict[str, Any]:
    """Toggle AI auto-reply for a specific conversation."""
    result = admin_client.table("chat_conversations") \
        .update({
            "ai_enabled": enabled,
            "updated_at": datetime.utcnow().isoformat()
        }) \
        .eq("id", conversation_id) \
        .eq("store_id", store_id) \
        .execute()

    if not result.data:
        raise Exception("Conversation not found or unauthorized")

    return result.data[0]


# ─────────────────────────────────────────────────────────────────────────────
# AI Co-Pilot Settings
# ─────────────────────────────────────────────────────────────────────────────

async def get_venue_ai_settings(owner_id: str) -> Dict[str, Any]:
    """Get AI Co-Pilot settings for a venue owner."""
    # Use admin client to bypass RLS for owner/staff settings
    client = supabase_admin if supabase_admin else supabase
    try:
        result = client.table("venue_ai_settings") \
            .select("*") \
            .eq("owner_id", owner_id) \
            .single() \
            .execute()

        if result.data:
            return result.data
    except Exception:
        pass

    # Return defaults if no settings saved yet
    return {
        "owner_id": owner_id,
        "tone": "professional",
        "custom_instructions": "",
        "automation_level": 80
    }


async def save_venue_ai_settings(
    owner_id: str,
    tone: str,
    custom_instructions: str,
    automation_level: int
) -> Dict[str, Any]:
    """Save AI Co-Pilot settings for a venue owner (upsert)."""
    settings_data = {
        "owner_id": owner_id,
        "tone": tone,
        "custom_instructions": custom_instructions,
        "automation_level": automation_level,
        "updated_at": datetime.utcnow().isoformat()
    }

    # Use admin client to bypass RLS
    client = supabase_admin if supabase_admin else supabase
    result = client.table("venue_ai_settings") \
        .upsert(settings_data, on_conflict="owner_id") \
        .execute()

    if not result.data:
        raise Exception("Failed to save AI settings")

    return result.data[0]


# ─────────────────────────────────────────────────────────────────────────────
# Analytics & Statistics
# ─────────────────────────────────────────────────────────────────────────────

async def generate_promo_suggestion(
    conversation_id: str,
    store_id: str
) -> Dict[str, Any]:
    """Generate AI promo code suggestion based on conversation context."""
    messages = await get_conversation_messages(conversation_id, limit=20)

    conversation_text = "\n".join([
        f"{msg['sender_type']}: {msg['message']}"
        for msg in messages
    ])

    prompt = f"""Based on this customer conversation, suggest a personalized promo code offer.

Conversation:
{conversation_text}

Generate a promo code suggestion including:
1. Discount percentage (10-30%)
2. Personalized message to send to customer
3. Promo code name

Format as JSON:
{{
  "discount_percentage": 20,
  "message": "...",
  "promo_code": "..."
}}
"""

    try:
        response = await get_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        import json
        return json.loads(response)
    except Exception as e:
        print(f"Promo generation error: {e}")
        return {
            "discount_percentage": 15,
            "message": "Special offer just for you! Enjoy 15% off your next booking.",
            "promo_code": "SPECIAL15"
        }


async def get_chat_statistics(store_id: str, venue_id: Optional[str] = None) -> Dict[str, Any]:
    """Get chat statistics for analytics."""
    query = admin_client.table("chat_conversations").select("*")
    if venue_id:
        query = query.eq("venue_id", venue_id)
    else:
        query = query.eq("store_id", store_id)
    
    conversations = query.execute()

    total_conversations = len(conversations.data or [])
    leads_count = len([c for c in (conversations.data or []) if c.get("category") == "lead"])
    past_guests_count = len([c for c in (conversations.data or []) if c.get("category") == "past_guest"])
    ai_handled = len([c for c in (conversations.data or []) if c.get("ai_enabled", True)])

    messages_query = admin_client.table("chat_messages").select("sentiment")
    if venue_id:
        # Need to join with conversations to filter by venue_id if not directly on messages
        # But actually chat_messages has venue_id or we can use store_id
        # Let's check if chat_messages has venue_id. If not, filter by store_id is fine for now
        # OR we filter by conversation_id in conversations
        conv_ids = [c["id"] for c in (conversations.data or [])]
        if conv_ids:
            messages_query = messages_query.in_("conversation_id", conv_ids)
        else:
             return {
                "total_conversations": 0, "leads": 0, "past_guests": 0, "ai_handled": 0,
                "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0}
            }
    else:
        messages_query = messages_query.eq("store_id", store_id)

    messages_result = messages_query.not_.is_("sentiment", "null").execute()

    sentiments = [m["sentiment"] for m in (messages_result.data or [])]

    return {
        "total_conversations": total_conversations,
        "leads": leads_count,
        "past_guests": past_guests_count,
        "ai_handled": ai_handled,
        "sentiment_distribution": {
            "positive": sentiments.count("positive"),
            "neutral": sentiments.count("neutral"),
            "negative": sentiments.count("negative")
        }
    }


async def _analyze_sentiment(text: str) -> str:
    """Analyze sentiment of a message using AI."""
    try:
        prompt = f"""Analyze the sentiment of the following message and respond with only one word: positive, neutral, or negative.

Message: "{text}"

Sentiment:"""

        response = await get_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=10
        )

        sentiment = response.strip().lower()
        if sentiment in ["positive", "neutral", "negative"]:
            return sentiment
        return "neutral"
    except Exception as e:
        print(f"Sentiment analysis error: {e}")
        return "neutral"
