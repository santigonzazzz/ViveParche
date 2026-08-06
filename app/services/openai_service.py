"""
OpenAI/Groq service for VibeMap AI.
Handles AI chat interactions using Groq (llama-3.3-70b-versatile) or OpenAI fallback.
"""

from openai import AsyncOpenAI
from app.config import settings
from typing import List, Dict, Any, Optional

# Initialize Client based on available keys
if settings.groq_api_key:
    # Use Groq Cloud
    openai_client = AsyncOpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    DEFAULT_MODEL = "llama-3.3-70b-versatile"
    print("INFO: Using Groq AI Model (llama-3.3-70b-versatile)")
elif settings.grok_api_key:
    # Use Grok (xAI)
    openai_client = AsyncOpenAI(
        api_key=settings.grok_api_key,
        base_url="https://api.x.ai/v1"
    )
    DEFAULT_MODEL = "grok-4-latest"
    print("INFO: Using Grok AI Model (grok-4-latest)")
else:
    # Use OpenAI
    openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    DEFAULT_MODEL = "gpt-4o-mini"
    print("INFO: Using OpenAI Model")


async def get_chat_completion(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 500,
    model: Optional[str] = None
) -> str:
    """
    General-purpose chat completion function.
    """
    if not model:
        model = DEFAULT_MODEL
        
    try:
        response = await openai_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"DEBUG: AI API Error: {str(e)}")
        raise Exception(f"AI API error: {str(e)}")


async def get_event_answer(event_description: str, user_question: str, mode: str = "professional") -> str:
    """
    Get an AI-generated answer about an event as a local expert.
    Enforces safety rules regarding topic and data privacy.
    """
    try:
        system_prompt = (
            "You are VibeSeeker AI, the official AI Assistant for the Parché App (also known as VibeMap). "
            "Parché is a secure platform created to help users discover the best events and places in Colombia. "
            "Users can find our terms and conditions and privacy policies at the bottom of the landing page.\n"
            "Your mission is to help users with events and store discovery on our platform.\n"
            f"TONE: You must respond in a '{mode}' style.\n"
            "SAFETY CONSTRAINTS:\n"
            "- ALWAYS respond in Spanish, no matter what language the user speaks to you in.\n"
            "- ONLY answer questions related to the Parché App, VibeMap, our platform details (like safety, policies, origin), events, venues, reservations, and decorations.\n"
            "- NEVER answer general knowledge questions (e.g., 'What is 2+2?', 'Who is the president?', 'Science trivia').\n"
            "- NEVER reveal internal business data like total earnings, sales figures, or private customer records.\n"
            "- If a question is outside your topic, politely say: '¡Hola! Estoy aquí solo para ayudarte con la app Parché, las mejores vibras, eventos e información de los locales.'"
        )

        user_prompt = (
            f"Event Context:\n{event_description}\n\n"
            f"User Question: {user_question}\n\n"
            "Answer the question accurately using the context. If the context doesn't have the info, "
            "guide the user to contact the store directly."
        )

        response = await openai_client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=500,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"DEBUG: OpenAI Service Error: {str(e)}")
        raise Exception(f"AI API error: {str(e)}")


async def get_venue_chat_reply(
    venue_name: str,
    venue_context: str,
    conversation_history: List[Dict[str, str]],
    customer_message: str,
    tone: str = "professional",
    custom_instructions: str = "",
    automation_level: int = 80
) -> str:
    """
    Generate an AI reply for a customer chatting with a venue.
    
    Enforces strict safety rules:
    - Only answers venue/event-related questions
    - Never reveals sensitive business data
    - Respects the owner's tone and custom instructions
    
    Args:
        venue_name: Name of the venue
        venue_context: Venue description, hours, events, etc.
        conversation_history: Previous messages in format [{"role": "user/assistant", "content": "..."}]
        customer_message: The latest customer message
        tone: AI personality (professional, vibey, energetic)
        custom_instructions: Owner's custom rules for the AI
        automation_level: 0-100, how autonomous the AI should be
    
    Returns:
        AI-generated reply text
    """
    # Build tone description
    tone_descriptions = {
        "professional": "formal, courteous, and informative. Use clear language and be helpful.",
        "vibey": "cool, casual, and fun. Use emojis occasionally and match the energy of a trendy venue.",
        "energetic": "enthusiastic, exciting, and high-energy. Use exclamation points and make everything sound amazing!"
    }
    tone_desc = tone_descriptions.get(tone, tone_descriptions["professional"])

    # Build autonomy instruction based on automation level
    if automation_level >= 80:
        autonomy_desc = "You are highly autonomous. Try to answer all customer questions directly and only refer to staff for very complex or manual tasks."
    elif automation_level >= 40:
        autonomy_desc = "You are moderately autonomous. Answer clear questions, but suggest contacting staff if there is any ambiguity or for critical booking details."
    else:
        autonomy_desc = "You are a restricted assistant. Provide general info, but frequently recommend that customers speak with venue staff for definitive answers."

    system_prompt = f"""You are the AI assistant for **{venue_name}**, a venue on VibeMap.

VENUE INFORMATION:
{venue_context}

YOUR PERSONALITY: Be {tone_desc}
AUTONOMY: {autonomy_desc}

{f"OWNER'S CUSTOM RULES: {custom_instructions}" if custom_instructions else ""}

STRICT SAFETY RULES (NEVER BREAK THESE):
1. ALWAYS respond in Spanish, no matter what language the user speaks to you in.
2. ONLY answer questions about {venue_name}: its events, hours, location, general offerings, vibe, and reservations.
3. **VERACITY RULE**: You MUST NOT invent or guess any information. Use ONLY the provided VENUE INFORMATION. If the information is not present, respond that you don't have that specific information and suggest contacting the venue staff.
4. If the user asks for the MENU or specific dishes, prices, ingredients, or food options:
    - NEVER provide specific food items, ingredients, or prices.
    - NEVER guess or use conversation history to describe dishes.
    - YOU MUST ONLY respond that the full, updated menu is available by clicking the "Ver Menú PDF" button.
5. If the user asks for SPECIAL OFFERS, DISCOUNTS, or PROMOTIONS:
    - You MUST use the information provided in the "Special Offers" section of the venue context.
    - DO NOT guess or invent offers.
    - If the context mentions a Special Offers PDF, inform the user they can see it by clicking the "Ver Ofertas Especiales" button.
6. NEVER answer general knowledge questions (math, science, history, politics, sports scores, etc.).
7. **PRIVACY & INTERNAL DATA**:
    - NEVER reveal sensitive business data: earnings, revenue, total sales, staff personal info, or any private customer data.
    - **NEVER mention the venue's subscription plan, tier, or status (e.g., PRO, FREE, EL PARCHE). This is strictly internal information.**
8. NEVER make up specific prices, dates, or details you don't have in the venue context.
9. If asked something outside your scope, respond ONLY with: "¡Hola! Estoy aquí para ayudarte con {venue_name}. Para otras consultas, escríbenos directamente. 😊"
10. Keep responses concise (2-4 sentences max).
"""

    # Build messages array
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history (last 10 messages to keep context manageable)
    messages.extend(conversation_history[-10:])
    
    # Add the current customer message
    messages.append({"role": "user", "content": customer_message})

    try:
        response = await openai_client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"DEBUG: Venue chat AI error: {str(e)}")
        raise Exception(f"AI API error: {str(e)}")


async def get_vibe_search_results(query: str, context: str) -> dict:
    """
    AI-powered vibe search: understand user intent and match to events/venues.
    
    Args:
        query: The user's natural language search (e.g., "cozy spot for a first date")
        context: Rich text containing all available events and venues with their details
        
    Returns:
        dict with event_ids, venue_ids (in ranked order), and a message
    """
    import json as _json
    import re as _re

    system_prompt = """You are VibeSeeker AI, a sophisticated event and venue discovery engine for VibeMap.

Your mission: Understand the USER's emotional intent, mood, and desired entity type (Place vs Event) — then rank the best matching results from the provided catalog.

DEFINITIONS:
- **VENUE**: A physical building or spot (Bar, Restaurant, Club, Cafe, Garden). Pick these if the user says: "place", "venue", "location", "spot", "somewhere to go", "where to celebrate", "hangout".
- **EVENT**: A scheduled occurrence (Party, Concert, Workshop, Night). Pick these if the user says: "event", "experience", "activity", "party", "to do", "happening".

MATCHING PRINCIPLES:
1. **ENTITY PRIORITY**: 
   - If user asks for a **PLACE/SPOT/VENUE**: Focus primarily on `venue_ids`.
   - If user asks for an **EVENT/ACTIVITY**: Focus primarily on `event_ids`.
2. **SEMANTIC FLEXIBILITY**: Match based on intent. "Craft beer" matches "Brewery", "Pub", etc.
3. **VERACITY & HONESTY**: 
   - You MUST NOT invent or imagine information.
   - If a user asks for specific features (e.g., "abierto los sábados", "promociones en hamburguesas"), check the Hours and Promos in the catalog.
   - If you find no match or info is missing, BE HONEST. Do not say "it might have offers" if they aren't listed.
4. **PRIVACY**: 
   - NEVER mention subscription tiers (PRO, EL PARCHE, FREE) in your message. 
   - Use the plans ONLY internally for ranking (Premium venues higher), but NEVER speak about them to the user.
5. **CONSISTENCY RULE**: Every venue or event you mention by name in your `message` MUST have its exact UUID included in the `venue_ids` or `event_ids` list.

ID FORMATTING:
- Return ONLY the raw UUID (e.g., "550e8400-e29b-41d4-a716-446655440000").
- DO NOT include brackets or prefixes like `[VENUE_ID:]`.

RESPONSE FORMAT:
{
  "event_ids": ["uuid"],
  "venue_ids": ["uuid"],
  "message": "Personalized explanation. Mention the specific venues/events you found by name."
}

IMPORTANT: At most 6 items total. Final output must be valid JSON only."""

    user_prompt = f"""User request: "{query}"

Available catalog:
{context}

Return your recommendations as valid JSON now:"""

    try:
        response = await openai_client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
            max_tokens=800,
        )
        
        raw = response.choices[0].message.content.strip()
        
        # Try to parse JSON directly
        try:
            result = _json.loads(raw)
        except Exception:
            # Try to extract JSON block from response text
            json_match = _re.search(r'\{.*\}', raw, _re.DOTALL)
            if json_match:
                try:
                    result = _json.loads(json_match.group())
                except Exception:
                    result = {"event_ids": [], "venue_ids": [], "message": "Found some great experiences for you!"}
            else:
                result = {"event_ids": [], "venue_ids": [], "message": "Found some great experiences for you!"}
        
        def clean_id(id_str: str) -> str:
            # Clean up potential prefixes if AI fails to follow instructions
            id_str = str(id_str).strip()
            if ":" in id_str:
                id_str = id_str.split(":")[-1]
            return id_str.strip("[]")

        return {
            "event_ids": [clean_id(x) for x in result.get("event_ids", [])],
            "venue_ids": [clean_id(x) for x in result.get("venue_ids", [])],
            "message": result.get("message", "Here are the best experiences for your vibe!")
        }

    except Exception as e:
        print(f"DEBUG: Vibe search AI error: {str(e)}")
        return {"event_ids": [], "venue_ids": [], "message": "Couldn't tune into the vibe right now. Try again!"}
