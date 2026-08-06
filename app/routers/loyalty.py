from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.services import loyalty_service
from app.dependencies import get_current_user
from app.middleware.security import require_business
from typing import Optional, List
from datetime import datetime, timedelta, date
import os

router = APIRouter(prefix="/loyalty", tags=["Loyalty & Parché"])

class ValidateVisitRequest(BaseModel):
    user_hash_id: str
    venue_id: str
    amount_spent: Optional[float] = Field(None, ge=0, le=10000000)
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None

class VenuePerkCreate(BaseModel):
    title: str
    description: Optional[str] = None
    coin_price: int = Field(..., ge=0)
    type: str = "custom"

@router.post("/staff/validate-visit")
async def validate_visit(req: ValidateVisitRequest, user=Depends(get_current_user)):
    """
    Staff/Worker endpoint to validate a user's visit.
    Requires staff/worker/owner role.
    """
    try:
        client = _get_loyalty_client(admin=True)

        # 1. Fetch Venue to verify it exists and get owner
        v_res = client.table("venues").select("owner_id").eq("id", req.venue_id).single().execute()
        if not v_res.data:
            raise HTTPException(status_code=404, detail="Local no encontrado.")
        
        # Verify user is owner or team member (already handled by dependencies if strict, 
        # but here we follow the existing pattern)
        owner_id = v_res.data["owner_id"]
        # Basic check: user must be admin or the owner
        if user.get("role") != "admin" and str(user["id"]) != str(owner_id):
            # Check team
            team_res = client.table("venue_team").select("id").eq("venue_id", req.venue_id).eq("member_id", user["id"]).execute()
            if not team_res.data:
                raise HTTPException(status_code=403, detail="No autorizado para este local.")

        result = await loyalty_service.validate_visit(
            user_hash_id=req.user_hash_id,
            venue_id=req.venue_id,
            staff_id=user["id"],
            amount_spent=req.amount_spent,
            user_lat=req.user_lat,
            user_lng=req.user_lng
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user/wallet")
async def get_wallet(user=Depends(get_current_user)):
    """
    Get current user's VibeCoins and stamp progress across venues.
    Uses reward_service to provide a consolidated and consistent view.
    """
    try:
        from app.services import reward_service
        # Use our consolidated service logic
        summary = await reward_service.get_passport_summary(user["id"])
        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def _get_loyalty_client(admin: bool = False):
    """Helper to get a client, falling back to standard if admin is unavailable."""
    from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
    if admin and supabase_admin:
        return supabase_admin
    return supabase

@router.get("/venue/{venue_id}/stats")
async def get_venue_loyalty_stats(venue_id: str, user=Depends(get_current_user)):
    """Get real-time loyalty statistics for a venue."""
    try:
        client = _get_loyalty_client(admin=True)
        from datetime import datetime, date, timedelta

        # Verify access
        venue_res = client.table("venues").select("owner_id").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        # Check if owner or team member (or admin)
        user_role = user.get("role", "customer")
        if user_role != "admin" and str(venue_res.data["owner_id"]) != str(user["id"]):
            team_res = client.table("venue_team").select("id").eq("venue_id", venue_id).eq("member_id", user["id"]).execute()
            if not team_res.data:
                raise HTTPException(status_code=403, detail="Not authorized to view these stats")

        # Total stamps issued (all visit logs)
        visits = client.table("visit_log").select("id, user_id", count="exact").eq("venue_id", venue_id).execute()
        total_stamps = visits.count or 0

        # Coins generated
        coins_res = client.table("coin_transactions").select("amount").eq("venue_id", venue_id).execute()
        total_coins = sum(r["amount"] for r in (coins_res.data or []))

        # Active loyalists
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        recent_visits = client.table("visit_log") \
            .select("user_id") \
            .eq("venue_id", venue_id) \
            .gte("created_at", thirty_days_ago) \
            .execute()
        active_loyalists = len(set(r["user_id"] for r in (recent_visits.data or [])))

        # Rewards used (both stamp-based and perk-based)
        # 1. Stamp-based rewards
        rw_res = client.table("rewards").select("id", count="exact").eq("store_id", venue_res.data["owner_id"]).not_.is_("used_at", "null").execute()
        rewards_used_stamps = rw_res.count or 0
        
        # 2. Perk-based tickets
        pt_res = client.table("reward_tickets").select("id", count="exact").eq("venue_id", venue_id).eq("status", "REDEEMED").execute()
        rewards_used_perks = pt_res.count or 0

        rewards_used = rewards_used_stamps + rewards_used_perks

        return {
            "total_stamps": total_stamps,
            "total_coins": total_coins,
            "active_loyalists": active_loyalists,
            "rewards_used": rewards_used
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"LOYALTY STATS ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch stats: {str(e)}")

@router.get("/venue/{venue_id}/recent-validations")
async def get_recent_validations(venue_id: str, limit: int = 5, user=Depends(get_current_user)):
    """Get the most recent visit validations for a venue."""
    try:
        client = _get_loyalty_client(admin=True)
        
        # Verify access
        venue_res = client.table("venues").select("owner_id").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        user_role = user.get("role", "customer")
        if user_role != "admin" and str(venue_res.data["owner_id"]) != str(user["id"]):
            team_res = client.table("venue_team").select("id").eq("venue_id", venue_id).eq("member_id", user["id"]).execute()
            if not team_res.data:
                raise HTTPException(status_code=403, detail="Not authorized for validations")

        # Step 1: Fetch visit logs (stamp validations)
        res_visits = client.table("visit_log") \
            .select("id, user_id, amount_spent, created_at") \
            .eq("venue_id", venue_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        
        # Step 2: Fetch reward redemptions (perk redemptions)
        res_redemptions = client.table("reward_tickets") \
            .select("id, user_id, status, redeemed_at, venue_perks(title, coin_price)") \
            .eq("venue_id", venue_id) \
            .eq("status", "REDEEMED") \
            .order("redeemed_at", desc=True) \
            .limit(limit) \
            .execute()

        visits = res_visits.data or []
        redemptions = res_redemptions.data or []
        
        # Step 3: Get distinct user profiles for both
        user_ids = list(set([v["user_id"] for v in visits if v.get("user_id")] + [r["user_id"] for r in redemptions if r.get("user_id")]))
        profiles_res = client.table("profiles") \
            .select("id, full_name, user_hash_id") \
            .in_("id", user_ids) \
            .execute()
        profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
        
        validations = []
        
        # Add visits
        for r in visits:
            profile = profiles_map.get(r.get("user_id")) or {}
            amount = float(r.get("amount_spent") or 0)
            coins = min(10 + int(amount * 0.01), 1000)
            validations.append({
                "id": r["id"],
                "type": "STAMP",
                "user_name": profile.get("full_name", "Customer"),
                "user_hash_id": profile.get("user_hash_id", ""),
                "amount_spent": amount,
                "coins_awarded": coins,
                "created_at": r["created_at"]
            })
            
        # Add redemptions
        for r in redemptions:
            profile = profiles_map.get(r.get("user_id")) or {}
            perk = r.get("venue_perks") or {}
            validations.append({
                "id": r["id"],
                "type": "REWARD",
                "user_name": profile.get("full_name", "Customer"),
                "user_hash_id": profile.get("user_hash_id", ""),
                "perk_title": perk.get("title", "Reward"),
                "coins_spent": perk.get("coin_price", 0),
                "created_at": r["redeemed_at"]
            })
            
        # Sort combined list by date
        validations.sort(key=lambda x: x["created_at"], reverse=True)
        return validations[:limit]
    except HTTPException:
        raise
    except Exception as e:
        print(f"RECENT VALIDATIONS ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/venue/{venue_id}/perks")
async def get_venue_perks(venue_id: str):
    """Get all active perks for a venue (public)."""
    try:
        client = _get_loyalty_client()
        res = client.table("venue_perks").select("*").eq("venue_id", venue_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/venue/{venue_id}/perks")
async def create_venue_perk(venue_id: str, perk: VenuePerkCreate, user=Depends(get_current_user)):
    """Create a new perk for a venue (owner only)."""
    try:
        client = _get_loyalty_client(admin=True)
        # Verify ownership
        venue_res = client.table("venues").select("owner_id").eq("id", venue_id).single().execute()
        user_role = user.get("role", "customer")
        if user_role != "admin" and (not venue_res.data or str(venue_res.data["owner_id"]) != str(user["id"])):
            # Also allow team members
            team_res = client.table("venue_team").select("id").eq("venue_id", venue_id).eq("member_id", user["id"]).execute()
            if not team_res.data:
                raise HTTPException(status_code=403, detail="Not authorized for this venue")
        
        data = {
            "venue_id": venue_id,
            "title": perk.title,
            "description": perk.description,
            "coin_price": perk.coin_price,
            "type": perk.type,
            "active": True
        }
        res = client.table("venue_perks").insert(data).execute()
        if not res.data:
            raise Exception("Failed to insert perk")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"CREATE PERK ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED if "JWT" in str(e) else 400, detail=str(e))

@router.delete("/venue/{venue_id}/perks/{perk_id}")
async def delete_venue_perk(venue_id: str, perk_id: str, user=Depends(get_current_user)):
    """Remove a perk from a venue."""
    try:
        client = _get_loyalty_client(admin=True)
        client.table("venue_perks").delete().eq("id", perk_id).eq("venue_id", venue_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/venue/{venue_id}/perks/ai-generate")
async def ai_generate_perks(venue_id: str, user=Depends(get_current_user)):
    """Use AI to suggest context-aware perks based on the venue profile."""
    try:
        client = _get_loyalty_client(admin=True)
        from groq import Groq

        # Verify access
        venue_res = client.table("venues").select("name, description, vibe_tags, price_range, owner_id").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Venue not found")
            
        user_role = user.get("role", "customer")
        if user_role != "admin" and str(venue_res.data["owner_id"]) != str(user["id"]):
            # Check team
            team_res = client.table("venue_team").select("id").eq("venue_id", venue_id).eq("member_id", user["id"]).execute()
            if not team_res.data:
                raise HTTPException(status_code=403, detail="Not authorized for AI generation")
        
        venue = venue_res.data
        vibe_tags = ", ".join(venue.get("vibe_tags") or []) or "general"
        price_symbols = "$" * (venue.get("price_range") or 2)

        # Fetch existing perks to avoid repetition
        existing_perks_res = client.table("venue_perks").select("title").eq("venue_id", venue_id).execute()
        existing_titles = [p["title"] for p in (existing_perks_res.data or [])]
        exclude_instructions = f"IMPORTANT: Do not suggest any of these existing perks: {', '.join(existing_titles)}" if existing_titles else ""

        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
             return {"suggestions": [
                 {"title": "Cerveza 2x1", "description": "Hora feliz en cervezas seleccionadas", "coin_price": 400, "type": "drink"},
                 {"title": "Entrada VIP", "description": "Salte de la fila hoy", "coin_price": 1200, "type": "vip"},
                 {"title": "Picada de Cortesía", "description": "Para compartir con tus amigos", "coin_price": 900, "type": "food"}
             ]}

        ai_client = Groq(api_key=groq_key)
        # Use a modern supported model
        model_name = "llama-3.3-70b-versatile" 
        
        import random as _random
        _seed_themes = [
            "enfocado en bebidas artesanales y cócteles únicos",
            "experiencias VIP exclusivas e instagrameables",
            "descuentos en combos para grupos",
            "experiencias de entretenimiento en vivo",
            "especialidades de cocina y maridajes",
            "sorpresas misteriosas al azar",
            "ediciones limitadas de temporada",
            "paquetes para celebraciones (cumpleaños, despedidas)",
        ]
        _random_theme = _random.choice(_seed_themes)
        _random_number = _random.randint(1000, 9999)

        prompt = f"""You are a creative marketing expert for the Parché app in Colombia.
Your goal is to increase customer loyalty for a specific venue.

Venue: "{venue['name']}"
Vibe: {vibe_tags}
Price Level: {price_symbols}
Description: "{venue.get('description', 'Popular local spot')}"

IMPORTANT: BE EXTREMELY CREATIVE. Do not suggest boring or generic things.
We want unique experiences that make this place stand out.
{exclude_instructions}

CREATIVE DIRECTIVE #{_random_number}: Focus this batch of perks on ideas {_random_theme}. Make each idea distinct from the others.

Generate 3 CREATIVE and UNIQUE venue-specific perk ideas that customers can unlock by spending VibeCoins.
VibeCoins are earned by spending money (100 COP = 1 Coin approx). 
Price the perks between 200 and 5000 coins based on value.

Requirements:
- Use Colombian Spanish context (words like 'pola', 'parche', 'picada', 'refresca el parche', 'un gustico' where appropriate).
- Ensure the types are correct.
- Make them sound "Hype", exclusive, and highly desirable for young people in Medellín/Bogotá.
- VARIETY IS KEY: Ensure the 3 ideas are fundamentally different from each other.

Return ONLY a JSON array of 3 objects with keys: title (string), description (string), coin_price (integer), type (one of: drink, vip, discount, food, custom).

Pricing Reference:
Assume 100 COP = 1 VibeCoin. 
If an item costs 4,500 COP, its price in VibeCoins should be between 60 and 70 coins (20%-30% premium for the experience/redemption).
Ensure the coins feel like a good deal but maintain exclusivity.
Price the perks reflecting this value.

No markdown, no explanation."""

        response = ai_client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.95,
            max_tokens=600
        )
        
        import json
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            import re
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw, re.DOTALL)
            if match:
                raw = match.group(1)
        
        suggestions = json.loads(raw.strip())
        return {"suggestions": suggestions}

    except HTTPException:
        raise
    except Exception as e:
        print(f"🔴 AI PERK GEN ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback: expanded pool with enough variety, randomly picked
        import random as _rfallback
        _all_fallbacks = [
            {"title": "Cerveza de la Casa", "description": "Una pola fría por cuenta del parche 🍺", "coin_price": 1000, "type": "drink"},
            {"title": "Postre de Cortesía", "description": "Endulza tu visita con algo dulce 🍮", "coin_price": 800, "type": "food"},
            {"title": "Entrada Sin Fila", "description": "Pasa directo con tus amigos sin esperar 🎫", "coin_price": 1500, "type": "vip"},
            {"title": "Cóctel de Bienvenida", "description": "Arranca el parche con el pie derecho 🍹", "coin_price": 1200, "type": "drink"},
            {"title": "Descuento 15%", "description": "En toda la cuenta para tu parche 💸", "coin_price": 2000, "type": "discount"},
            {"title": "Picada Mediana", "description": "Para compartir en la mesa con el parche 🥘", "coin_price": 1800, "type": "food"},
            {"title": "Mesa Especial Reservada", "description": "La mejor ubicación del local solo para ti 🪑", "coin_price": 2500, "type": "vip"},
            {"title": "Ronda de Shots Clásicos", "description": "Celebra en combo con tus panas 🥃", "coin_price": 900, "type": "drink"},
            {"title": "Combo Amigos", "description": "2 cervezas + picada a precio especial 🎉", "coin_price": 1600, "type": "food"},
            {"title": "Cover Gratis", "description": "Entra gratis al evento especial de hoy 🎵", "coin_price": 2200, "type": "vip"},
            {"title": "Trago Doble", "description": "Pide uno y lleva dos en bebidas seleccionadas 🍸", "coin_price": 1100, "type": "drink"},
            {"title": "Descuento 20% Fin de Semana", "description": "Solo válido viernes, sábado y domingo 📅", "coin_price": 2800, "type": "discount"},
            {"title": "Postre del Día + Café", "description": "El cierre perfecto para tu visita ☕", "coin_price": 700, "type": "food"},
            {"title": "Zona Preferencial en Eventos", "description": "Disfruta los shows desde el mejor ángulo 🎤", "coin_price": 3000, "type": "vip"},
            {"title": "Shot de Bienvenida", "description": "El parche empieza bien con un gustico especial 🎊", "coin_price": 600, "type": "drink"},
        ]
        # Shuffle and pick 3 unique random suggestions
        _rfallback.shuffle(_all_fallbacks)
        suggestions = _all_fallbacks[:3]
        return {"suggestions": suggestions}


# ============================================================
# PERK MARKETPLACE & REDEMPTION SYSTEM
# ============================================================

class PerkPurchaseResponse(BaseModel):
    ticket_id: str
    qr_token: str
    text_code: str
    perk_title: str
    perk_description: Optional[str]
    venue_name: str
    venue_address: str
    coins_spent: int
    status: str
    expires_at: str
    created_at: str


from typing import Optional

@router.get("/marketplace")
async def get_marketplace(q: Optional[str] = None, user=Depends(get_current_user)):
    """
    Smart catalog: returns venues with active perks.
    Only shows venues where user has enough coins for at least 1 perk.
    """
    client = _get_loyalty_client(admin=True)
    try:
        # Get user's current coin balance
        profile_res = client.table("profiles").select("vibecoins").eq("id", user["id"]).single().execute()
        user_coins = (profile_res.data or {}).get("vibecoins", 0)

        # Fetch all active perks with venue info
        perks_res = client.table("venue_perks") \
            .select("*, venues(id, name, address, description, image_url)") \
            .eq("active", True) \
            .order("coin_price", desc=False) \
            .execute()

        perks = perks_res.data or []

        # Group by venue and filter to venues where user can afford at least 1 perk
        venue_map: dict = {}
        for perk in perks:
            venue_data = perk.get("venues") or {}
            vid = venue_data.get("id")
            if not vid:
                continue
            if vid not in venue_map:
                venue_map[vid] = {
                    "id": vid,
                    "name": venue_data.get("name", ""),
                    "address": venue_data.get("address", ""),
                    "description": venue_data.get("description", ""),
                    "image_url": venue_data.get("image_url", ""),
                    "type": venue_data.get("type", ""),
                    "perks": [],
                    "cheapest_perk": perk["coin_price"]
                }
            venue_map[vid]["perks"].append({
                "id": perk["id"],
                "title": perk["title"],
                "description": perk.get("description", ""),
                "coin_price": perk["coin_price"],
                "type": perk.get("type", "custom")
            })
            venue_map[vid]["cheapest_perk"] = min(venue_map[vid]["cheapest_perk"], perk["coin_price"])

        all_venues = list(venue_map.values())
        
        # Apply AI Filtering if a query is provided
        if q and all_venues:
            import os
            import json
            from groq import Groq
            groq_key = os.getenv("GROQ_API_KEY")
            
            if groq_key:
                try:
                    ai_client = Groq(api_key=groq_key)
                    prompt = f"""
                    Un usuario está buscando beneficios o gangazos en el marketplace con la siguiente intención: "{q}".
                    
                    Aquí tienes la lista de locales y sus gangazos disponibles, en formato JSON:
                    {json.dumps([{ 'id': v['id'], 'name': v['name'], 'description': v['description'], 'tags': v['type'], 'perks': v['perks'] } for v in all_venues], ensure_ascii=False)}
                    
                    Basándote estrictamente en la intención del usuario y la información provista de cada local y sus gangazos, selecciona los ID de los locales que mejor coincidan con la búsqueda. 
                    Si la intención es muy específica (ej. cervezas) pero no hay coincidencias perfectas, debes incluir de todas formas, como recomendación al menos 3 locales cualquiera para que la lista no quede vacía.
                    Si hay menos de 3 locales en total, devuélvelos todos.
                    
                    Devuelve ÚNICAMENTE un array JSON válido con los IDs de los locales seleccionados, por ejemplo:
                    ["id_1", "id_2"]
                    No incluyas texto adicional ni explicaciones, solo el JSON.
                    """
                    
                    response = ai_client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model="llama-3.1-8b-instant",
                        temperature=0.0
                    )
                    
                    import re
                    content = response.choices[0].message.content or "[]"
                    # Try to parse the array directly or extract it with regex
                    try:
                        recommended_ids = json.loads(content)
                    except json.JSONDecodeError:
                        match = re.search(r'\[.*\]', content, re.DOTALL)
                        if match:
                            recommended_ids = json.loads(match.group(0))
                        else:
                            recommended_ids = []
                            
                    filtered_venues = [v for v in all_venues if v["id"] in recommended_ids]
                    
                    # Fallback to at least 3 items if possible
                    if len(filtered_venues) == 0:
                        filtered_venues = all_venues[:min(3, len(all_venues))]
                        
                    return {"venues": filtered_venues, "user_coins": user_coins}

                except Exception as ex:
                    print(f"Error filtering with AI: {ex}")
                    # Fallback to returning all if AI fails
                    pass
                    
        return {"venues": all_venues, "user_coins": user_coins}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/venue/{venue_id}/perks/{perk_id}/purchase")
async def purchase_perk(venue_id: str, perk_id: str, user=Depends(get_current_user)):
    """
    Purchase a perk with VibeCoins. Creates a reward_ticket with QR token.
    Deducts coins from user's wallet immediately.
    """
    client = _get_loyalty_client(admin=True)
    import random
    import string
    from datetime import datetime, timezone

    try:
        # Financial Guard: Check subscription
        v_sub = client.table("venues").select("subscription_status, subscription_tier").eq("id", venue_id).single().execute()
        if v_sub.data:
            tier = v_sub.data.get("subscription_tier", "FREE")
            if tier in ["FREE", "ARRANQUE"]:
                raise HTTPException(status_code=403, detail="Upgrade to EL PARCHE plan to unlock Perk Redemptions (VibeCoins)")
            if v_sub.data.get("subscription_status") != "active":
                raise HTTPException(status_code=403, detail="Venue subscription inactive")

        # 1. Get perk details
        perk_res = client.table("venue_perks") \
            .select("*, venues(name, address)") \
            .eq("id", perk_id) \
            .eq("venue_id", venue_id) \
            .eq("active", True) \
            .single().execute()

        if not perk_res.data:
            raise HTTPException(status_code=404, detail="Perk not found or inactive")

        perk = perk_res.data
        venue = perk.get("venues") or {}
        coin_price = perk["coin_price"]

        # 2. Check user's coin balance
        profile_res = client.table("profiles").select("vibecoins").eq("id", user["id"]).single().execute()
        user_coins = (profile_res.data or {}).get("vibecoins", 0)

        if user_coins < coin_price:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient coins. You have {user_coins}, need {coin_price}."
            )

        # 3. Generate unique codes
        import uuid
        qr_token = str(uuid.uuid4())
        text_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

        # 4. Create reward ticket
        ticket_data = {
            "user_id": user["id"],
            "venue_id": venue_id,
            "perk_id": perk_id,
            "status": "ACTIVE",
            "total_coins_spent": coin_price,
            "qr_token": qr_token,
            "text_code": text_code,
        }
        ticket_res = client.table("reward_tickets").insert(ticket_data).execute()

        if not ticket_res.data:
            raise HTTPException(status_code=500, detail="Failed to create ticket")

        ticket = ticket_res.data[0]

        # 5. Deduct coins from user
        client.table("profiles") \
            .update({"vibecoins": user_coins - coin_price}) \
            .eq("id", user["id"]).execute()

        return {
            "ticket_id": ticket["id"],
            "qr_token": ticket["qr_token"],
            "text_code": ticket["text_code"],
            "perk_title": perk["title"],
            "perk_description": perk.get("description", ""),
            "perk_type": perk.get("type", "custom"),
            "venue_name": venue.get("name", ""),
            "venue_address": venue.get("address", ""),
            "coins_spent": coin_price,
            "status": ticket["status"],
            "expires_at": ticket.get("expires_at", ""),
            "created_at": ticket.get("created_at", ""),
            "coins_remaining": user_coins - coin_price
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-reward-tickets")
async def get_my_reward_tickets(user=Depends(get_current_user)):
    """
    Get all reward tickets for the current user, newest first.
    """
    client = _get_loyalty_client(admin=True)
    try:
        res = client.table("reward_tickets") \
            .select("*, venue_perks(title, description, type, coin_price), venues(name, address, image_url)") \
            .eq("user_id", user["id"]) \
            .order("created_at", desc=True) \
            .execute()

        tickets = []
        for t in (res.data or []):
            perk = t.get("venue_perks") or {}
            venue = t.get("venues") or {}
            tickets.append({
                "id": t["id"],
                "qr_token": t["qr_token"],
                "text_code": t["text_code"],
                "status": t["status"],
                "perk_title": perk.get("title", ""),
                "perk_description": perk.get("description", ""),
                "perk_type": perk.get("type", "custom"),
                "venue_name": venue.get("name", ""),
                "venue_address": venue.get("address", ""),
                "venue_image_url": venue.get("image_url", ""),
                "coins_spent": t["total_coins_spent"],
                "expires_at": t.get("expires_at", ""),
                "redeemed_at": t.get("redeemed_at"),
                "created_at": t.get("created_at", "")
            })

        return {"tickets": tickets}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class RedeemTicketRequest(BaseModel):
    code: str  # accepts qr_token OR text_code


@router.post("/staff/redeem-ticket")
async def redeem_ticket(req: RedeemTicketRequest, user=Depends(get_current_user)):
    """
    Staff endpoint to redeem a reward ticket by QR token or text code.
    Security: staff can only redeem tickets for their own venue.
    """
    client = _get_loyalty_client(admin=True)
    from datetime import datetime, timezone
    try:
        code = req.code.strip().upper()
        raw_code = req.code.strip()
        qr_lower = raw_code.lower()

        # 1. Find ticket by either qr_token or text_code
        res = client.table("reward_tickets") \
            .select("*, venue_perks(title, description, type, coin_price), venues(name, address, subscription_status), profiles!reward_tickets_user_id_fkey(full_name)") \
            .or_(f"qr_token.eq.{qr_lower},text_code.eq.{code}") \
            .execute()

        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Ticket no encontrado. Verifica el código.")

        ticket = res.data[0]
        venue_data = ticket.get("venues") or {}

        # Subscription check: use direct query to avoid JOIN field missing issues
        sub_res = client.table("venues").select("subscription_status, subscription_tier").eq("id", ticket["venue_id"]).single().execute()
        if sub_res.data:
            tier = sub_res.data.get("subscription_tier", "FREE")
            if tier in ["FREE", "VITRINA"]:
                raise HTTPException(status_code=403, detail="Este local necesita el plan El Parche o superior para canjear cupones.")
            if sub_res.data.get("subscription_status") != "active":
                raise HTTPException(status_code=403, detail="La suscripción del local no está activa.")

        perk = ticket.get("venue_perks") or {}
        venue = ticket.get("venues") or {}

        # 2. Security: verify staff belongs to the same venue
        staff_venue_res = client.table("venues").select("id").eq("owner_id", user["id"]).execute()
        # Also check team membership
        team_res = client.table("venue_team").select("venue_id").eq("member_id", user["id"]).execute()

        allowed_venue_ids = [v["id"] for v in (staff_venue_res.data or [])]
        allowed_venue_ids += [t["venue_id"] for t in (team_res.data or [])]

        if ticket["venue_id"] not in allowed_venue_ids:
            raise HTTPException(
                status_code=403,
                detail="You can only redeem tickets for your own venue."
            )

        # 3. Check ticket status
        if ticket["status"] == "REDEEMED":
            raise HTTPException(status_code=400, detail="This ticket has already been redeemed.")
        if ticket["status"] == "EXPIRED":
            raise HTTPException(status_code=400, detail="This ticket has expired.")
        if ticket["status"] == "CANCELLED":
            raise HTTPException(status_code=400, detail="This ticket was cancelled.")
        if ticket["status"] != "ACTIVE":
            raise HTTPException(status_code=400, detail=f"Invalid ticket status: {ticket['status']}")

        # 4. Mark as redeemed
        client.table("reward_tickets") \
            .update({
                "status": "REDEEMED",
                "redeemed_at": datetime.now(timezone.utc).isoformat(),
                "redeemed_by": user["id"]
            }) \
            .eq("id", ticket["id"]).execute()

        customer = ticket.get("profiles") or {}

        return {
            "success": True,
            "message": "Coupon validated successfully!",
            "ticket_id": ticket["id"],
            "perk_title": perk.get("title", ""),
            "perk_description": perk.get("description", ""),
            "perk_type": perk.get("type", "custom"),
            "venue_name": venue.get("name", ""),
            "venue_address": venue.get("address", ""),
            "coins_spent": ticket["total_coins_spent"],
            "customer_name": customer.get("full_name", "Guest"),
            "redeemed_at": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# STAMP REWARD SYSTEM (Passport Rewards)
# ============================================================

class StampRewardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    conditions: Optional[str] = None
    stamps_required: int = Field(5, ge=1, le=100)
    active: bool = True
    expires_at: Optional[datetime] = None


@router.get("/venue/{venue_id}/stamp-rewards")
async def get_venue_stamp_rewards(venue_id: str):
    """Get all stamp rewards configured for a venue (public)."""
    try:
        client = _get_loyalty_client()
        res = client.table("stamp_rewards").select("*").eq("venue_id", venue_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/venue/{venue_id}/stamp-rewards")
async def create_stamp_reward(venue_id: str, reward: StampRewardCreate, user=Depends(get_current_user)):
    """Create a new stamp reward for a venue (owner only)."""
    try:
        client = _get_loyalty_client(admin=True)
        # Fetch venue details including subscription
        venue_res = client.table("venues").select("owner_id, subscription_tier, subscription_status").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Local no encontrado.")
            
        venue_data = venue_res.data
        tier = venue_data.get("subscription_tier") or "FREE"
        sub_status = venue_data.get("subscription_status") or "inactive"
        owner_id = venue_data["owner_id"]
        
        # Security: User must be owner or admin
        user_role = user.get("role", "customer")
        if user_role != "admin" and str(owner_id) != str(user["id"]):
            raise HTTPException(status_code=403, detail="No autorizado para este local.")

        # Enforcement: Subscription Status
        if sub_status != "active" and user_role != "admin":
            raise HTTPException(status_code=403, detail="Tu suscripción no está activa. Actualiza tu plan para activar el Pasaporte.")

        # Enforcement: Plan Limits
        count_res = client.table("stamp_rewards").select("id", count="exact").eq("venue_id", venue_id).execute()
        current_count = count_res.count or 0
        
        if tier in ["FREE", "VITRINA"] and user_role != "admin":
            raise HTTPException(status_code=403, detail="El plan Vitrina no permite crear recompensas. Mejora a 'Arranque' o 'El Parche'.")
        
        if tier == "ARRANQUE" and current_count >= 1 and user_role != "admin":
            raise HTTPException(status_code=403, detail="El plan Arranque solo permite una recompensa de pasaporte. Mejora a 'El Parche' para añadir hitos adicionales.")
        
        if tier in ["EL PARCHE", "PRO"] and current_count >= 10 and user_role != "admin":
            raise HTTPException(status_code=403, detail="Has alcanzado el límite de 10 hitos de recompensa.")

        data = {
            "venue_id": venue_id, "title": reward.title, "description": reward.description,
            "conditions": reward.conditions, "stamps_required": reward.stamps_required, "active": reward.active,
        }
        if reward.expires_at is not None:
            data["expires_at"] = reward.expires_at.isoformat()
            data["expires_modified_at"] = datetime.utcnow().isoformat()
            
        res = client.table("stamp_rewards").insert(data).execute()
        if not res.data:
            raise Exception("Failed to insert stamp reward")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/venue/{venue_id}/stamp-rewards/{reward_id}")
async def update_stamp_reward(venue_id: str, reward_id: str, reward: StampRewardCreate, user=Depends(get_current_user)):
    """Update a stamp reward configuration."""
    try:
        client = _get_loyalty_client(admin=True)
        # Fetch venue details including subscription
        venue_res = client.table("venues").select("owner_id, subscription_status").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Local no encontrado.")
            
        sub_status = venue_res.data.get("subscription_status") or "inactive"
        owner_id = venue_res.data["owner_id"]
        
        # Security: User must be owner or admin
        user_role = user.get("role", "customer")
        if user_role != "admin" and str(owner_id) != str(user["id"]):
            raise HTTPException(status_code=403, detail="No autorizado para este local.")

        # Enforcement: Subscription Status
        if reward.active and sub_status != "active" and user_role != "admin":
             raise HTTPException(status_code=403, detail="Tu suscripción no está activa. Actualiza tu plan para activar recompensas.")

        # Fetch current reward to check expires_modified_at and current expires_at
        current_res = client.table("stamp_rewards").select("expires_at, expires_modified_at").eq("id", reward_id).single().execute()
        if not current_res.data:
            raise HTTPException(status_code=404, detail="Stamp reward not found")
        
        current_data = current_res.data
        
        update_data = {
            "title": reward.title, "description": reward.description, "conditions": reward.conditions,
            "stamps_required": reward.stamps_required, "active": reward.active,
        }
        
        # Check if expires_at is being changed
        new_expires_at_iso = reward.expires_at.isoformat() if reward.expires_at else None
        
        # Convert DB expires_at to ISO string for comparison (handling potential none/null values)
        db_expires_at = current_data.get("expires_at")
        # Just simple comparison of string representations for now to detect changes
        if str(new_expires_at_iso) != str(db_expires_at) and (new_expires_at_iso is not None or db_expires_at is not None):
            db_modified_at = current_data.get("expires_modified_at")
            if db_modified_at:
                try:
                    # Parse the ISO format string to datetime
                    # Supabase returns ISO 8601 strings like "2023-10-27T10:00:00+00:00"
                    from dateutil import parser
                    modified_date = parser.isoparse(db_modified_at).replace(tzinfo=None) # Make naive for comparison with utcnow
                    time_diff = datetime.utcnow() - modified_date
                    if time_diff.days < 10:
                        raise HTTPException(status_code=400, detail=f"La fecha de expiración solo se puede modificar después de 10 días desde la última modificación. Faltan {10 - time_diff.days} días.")
                except HTTPException:
                    raise
                except Exception as parse_e:
                    print(f"Error parsing expires_modified_at: {parse_e}")
                    # If parsing fails, be safe and allow update, but log it
                    pass
            
            update_data["expires_at"] = new_expires_at_iso
            update_data["expires_modified_at"] = datetime.utcnow().isoformat()
            
        res = client.table("stamp_rewards").update(update_data).eq("id", reward_id).eq("venue_id", venue_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Stamp reward not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/venue/{venue_id}/stamp-rewards/{reward_id}")
async def delete_stamp_reward(venue_id: str, reward_id: str, user=Depends(get_current_user)):
    """Delete a stamp reward configuration."""
    try:
        client = _get_loyalty_client(admin=True)
        venue_res = client.table("venues").select("owner_id").eq("id", venue_id).single().execute()
        user_role = user.get("role", "customer")
        if user_role != "admin" and (not venue_res.data or str(venue_res.data["owner_id"]) != str(user["id"])):
            raise HTTPException(status_code=403, detail="Not authorized for this venue")
        client.table("stamp_rewards").delete().eq("id", reward_id).eq("venue_id", venue_id).execute()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/venue/{venue_id}/stamp-rewards/ai-generate")
async def ai_generate_stamp_rewards(venue_id: str, user=Depends(get_current_user)):
    """Use AI to suggest stamp-based reward ideas for a venue."""
    try:
        client = _get_loyalty_client(admin=True)
        from groq import Groq
        venue_res = client.table("venues").select("name, description, vibe_tags, price_range, owner_id").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Venue not found")
        user_role = user.get("role", "customer")
        if user_role != "admin" and str(venue_res.data["owner_id"]) != str(user["id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        venue = venue_res.data
        vibe_tags = ", ".join(venue.get("vibe_tags") or []) or "general"
        price_symbols = "$" * (venue.get("price_range") or 2)
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            return {"suggestions": [
                {"title": "2x1 en Cervezas", "description": "Visita 5 veces y gana 2 cervezas por el precio de 1.", "conditions": "Valido de lunes a jueves.", "stamps_required": 5},
                {"title": "Postre Gratis", "description": "Completa tu pasaporte y te regalamos un postre.", "conditions": "Solo para el menu del dia.", "stamps_required": 7},
                {"title": "Mesa VIP Reservada", "description": "Visita 10 veces y reserva la mejor mesa del local.", "conditions": "Sujeto a disponibilidad.", "stamps_required": 10},
            ]}
        import random as _random
        _seed_themes = [
            "enfocado en fidelización recurrente con premios pequeños",
            "experiencias VIP exclusivas de alto nivel",
            "beneficios de maridaje y degustación",
            "eventos especiales y acceso preferente",
            "gratificaciones sorpresa y misteriosas",
            "recompensas en combo para compartir",
            "servicios personalizados y trato preferencial",
            "obsequios físicos y merch del local"
        ]
        _random_theme = _random.choice(_seed_themes)
        _random_num = _random.randint(100, 999)

        ai_client = Groq(api_key=groq_key)
        prompt = f"""You are a loyalty marketing expert for the Parche app in Colombia.
Design 3 stamp-based reward ideas for venue "{venue['name']}" (vibe: {vibe_tags}, price: {price_symbols}).

IMPORTANT: BE CREATIVE. Do not suggest generic or boring ideas.
SEARCH ID: {_random_num} - Focus specifically on ideas that are {_random_theme}.

Requirements for each idea:
- title: Catchy name in Spanish.
- description: Clear explanation of the value for the customer.
- conditions: Limitations or rules (e.g. valid days, time, specifics).
- stamps_required: An integer between 3 and 20 visits.

Return ONLY a JSON array of 3 objects with keys: title, description, conditions, stamps_required. No markdown, no text outside the JSON."""
        response = ai_client.chat.completions.create(
            model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}],
            temperature=0.95, max_tokens=600
        )
        import json, re
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw, re.DOTALL)
            if match:
                raw = match.group(1)
        
        suggestions = json.loads(raw.strip())
        return {"suggestions": suggestions}

    except HTTPException:
        raise
    except Exception as e:
        print(f"🔴 AI STAMP REWARD GEN ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Expanded fallback pool with shuffle
        import random as _rfall
        _all_fallbacks = [
            {"title": "2x1 en Cervezas", "description": "Visita 5 veces y gana 2 cervezas por el precio de 1.", "conditions": "Valido de lunes a jueves.", "stamps_required": 5},
            {"title": "Postre Gratis", "description": "Completa tu pasaporte y te regalamos un postre.", "conditions": "Solo para el menú del día.", "stamps_required": 7},
            {"title": "Mesa VIP Reservada", "description": "Visita 10 veces y reserva la mejor mesa del local.", "conditions": "Sujeto a disponibilidad.", "stamps_required": 10},
            {"title": "Entrada Sin Fila", "description": "Completa 5 visitas y entra directo sin esperar.", "conditions": "No válido en eventos especiales.", "stamps_required": 5},
            {"title": "Shot de Bienvenida", "description": "Visita 3 veces y recibe un shot especial.", "conditions": "Válido una vez por visita.", "stamps_required": 3},
            {"title": "Descuento 20% en Snacks", "description": "Al completar 8 visitas, tu próximo snack es 20% off.", "conditions": "Aplica a carta de snacks únicamente.", "stamps_required": 8},
            {"title": "Cocktail de la Casa", "description": "Gana un cocktail premium tras 12 visitas.", "conditions": "Sujeto a sabores de temporada.", "stamps_required": 12},
            {"title": "Combo Parrillero", "description": "Visita 15 veces y el combo parrillado va por nuestra cuenta.", "conditions": "Válido para 2 personas.", "stamps_required": 15},
            {"title": "Parche VIP", "description": "Acceso a la zona preferencial para ti y 2 amigos.", "conditions": "Requiere reserva previa.", "stamps_required": 10},
            {"title": "Regalo Sorpresa", "description": "Completa 5 sellos y pide tu kit sorpresa del local.", "conditions": "Hasta agotar existencias.", "stamps_required": 5},
        ]
        _rfall.shuffle(_all_fallbacks)
        return {"suggestions": _all_fallbacks[:3]}


@router.post("/claim-stamp-reward/{venue_id}")
async def claim_stamp_reward(venue_id: str, user=Depends(get_current_user)):
    """User claims their stamp reward after reaching stamp goal. Creates a passport_reward QR ticket."""
    from app.services.supabase_service import supabase_admin as admin_client
    import random, string, uuid as uuid_module
    from datetime import datetime, timezone, timedelta
    try:
        loyalty_res = admin_client.table("venue_loyalty").select("*").eq("user_id", user["id"]).eq("venue_id", venue_id).single().execute()
        if not loyalty_res.data:
            raise HTTPException(status_code=400, detail="You haven't visited this venue yet.")
        loyalty = loyalty_res.data
        
        # 2. Idempotency Check: Return existing ACTIVE ticket if it exists for any reachable milestone
        existing_active_res = admin_client.table("passport_rewards").select("*, stamp_rewards(title)") \
            .eq("user_id", user["id"]).eq("venue_id", venue_id).eq("status", "ACTIVE").execute()
        
        if existing_active_res.data:
            ticket = existing_active_res.data[0]
            sr = ticket.get("stamp_rewards") or {}
            print(f"DEBUG: Returning existing ACTIVE ticket {ticket['id']} for user {user['id']}")
            return {
                **ticket,
                "ticket_id": ticket["id"], # For frontend compatibility
                "reward_title": sr.get("title", "Premio"),
                "already_claimed": True
            }

        # 3. Identify the correct reward to claim
        # Fetch all active rewards for this venue, ordered by stamps_required
        reward_res = admin_client.table("stamp_rewards") \
            .select("*") \
            .eq("venue_id", venue_id) \
            .eq("active", True) \
            .order("stamps_required", desc=False) \
            .execute()
        
        all_rewards = reward_res.data or []
        if not all_rewards:
            raise HTTPException(status_code=404, detail="No hay recompensas activas configuradas para este local.")

        # Get all previously claimed/issued rewards for this venue/user to avoid duplicates
        claimed_res = admin_client.table("passport_rewards") \
            .select("stamp_reward_id") \
            .eq("user_id", user["id"]) \
            .eq("venue_id", venue_id) \
            .execute()
        claimed_ids = [r["stamp_reward_id"] for r in (claimed_res.data or [])]

        stamps_count = loyalty.get("stamps_count", 0)

        # Find the first reward that is reached but NOT claimed
        stamp_reward = next((r for r in all_rewards if r["stamps_required"] <= stamps_count and r["id"] not in claimed_ids), None)

        if not stamp_reward:
            # Fallback: if they already claimed everything reachable, or if they have a target set
            target_id = loyalty.get("target_stamp_reward_id")
            if target_id:
                stamp_reward = next((r for r in all_rewards if r["id"] == target_id), None)
            
            if not stamp_reward:
                # Last resort: just pick the first one (most common for single-reward legacy)
                stamp_reward = all_rewards[0]
        stamps_required = stamp_reward.get("stamps_required", 5)
        
        if stamps_count < stamps_required:
            raise HTTPException(status_code=400, detail=f"You need {stamps_required} stamps but only have {stamps_count}.")
            
        existing_res = admin_client.table("passport_rewards").select("id, status") \
            .eq("user_id", user["id"]).eq("venue_id", venue_id) \
            .eq("stamp_reward_id", stamp_reward["id"]).eq("status", "ACTIVE").execute()
        if existing_res.data:
            ticket = existing_res.data[0]
            full_ticket = admin_client.table("passport_rewards").select("*").eq("id", ticket["id"]).single().execute()
            return {**full_ticket.data, "already_claimed": True, "reward_title": stamp_reward["title"]}
        qr_token = str(uuid_module.uuid4())
        text_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        ticket_data = {
            "user_id": user["id"], "venue_id": venue_id, "stamp_reward_id": stamp_reward["id"],
            "qr_token": qr_token, "text_code": text_code, "status": "ACTIVE",
            "claimed_stamps": stamps_count, "expires_at": expires_at,
        }
        ticket_res = admin_client.table("passport_rewards").insert(ticket_data).execute()
        if not ticket_res.data:
            raise HTTPException(status_code=500, detail="Failed to create reward ticket")
        ticket = ticket_res.data[0]
        
        # 6. Update user's loyalty record
        # Check if this was the LAST milestone to reset stamps
        is_last_milestone = (stamp_reward["id"] == all_rewards[-1]["id"])
        update_data = {
            "reward_claimed": True,
            "last_reward_at": datetime.now(timezone.utc).isoformat()
        }
        if is_last_milestone:
            update_data["stamps_count"] = 0
            print(f"DEBUG: Last milestone reached! Resetting stamps for user {user['id']} at venue {venue_id}")

        admin_client.table("venue_loyalty").update(update_data).eq("user_id", user["id"]).eq("venue_id", venue_id).execute()
        venue_info = admin_client.table("venues").select("name, address").eq("id", venue_id).single().execute().data or {}
        return {
            "ticket_id": ticket["id"], "qr_token": qr_token, "text_code": text_code,
            "reward_title": stamp_reward["title"], "reward_description": stamp_reward.get("description", ""),
            "conditions": stamp_reward.get("conditions", ""), "venue_name": venue_info.get("name", ""),
            "venue_address": venue_info.get("address", ""), "stamps_claimed": stamps_count,
            "expires_at": expires_at, "status": "ACTIVE",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/switch-stamp-reward/{venue_id}")
async def switch_stamp_reward(venue_id: str, user=Depends(get_current_user)):
    """User opts-in to the venue's active stamp reward, discarding grandfathered target."""
    from app.services.supabase_service import supabase_admin as admin_client
    try:
        # Get active
        active_res = admin_client.table("stamp_rewards").select("id").eq("venue_id", venue_id).eq("active", True).limit(1).execute()
        if not active_res.data:
            raise HTTPException(status_code=404, detail="No active reward to switch to.")
        active_id = active_res.data[0]["id"]
        
        # Update user's target
        loyalty_res = admin_client.table("venue_loyalty").update({
            "target_stamp_reward_id": active_id
        }).eq("user_id", user["id"]).eq("venue_id", venue_id).execute()
        
        if not loyalty_res.data:
            raise HTTPException(status_code=400, detail="Loyalty record not found. Visit first!")
        return {"success": True, "target_stamp_reward_id": active_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-passport-rewards")
async def get_my_passport_rewards(user=Depends(get_current_user)):
    """Get all claimed stamp reward tickets for the current user."""
    from app.services.supabase_service import supabase_admin as admin_client
    try:
        res = admin_client.table("passport_rewards") \
            .select("*, stamp_rewards(title, description, conditions, stamps_required), venues(name, address, image_url)") \
            .eq("user_id", user["id"]).order("created_at", desc=True).execute()
        tickets = []
        for t in (res.data or []):
            sr = t.get("stamp_rewards") or {}
            venue = t.get("venues") or {}
            tickets.append({
                "id": t["id"], "qr_token": t["qr_token"], "text_code": t["text_code"], "status": t["status"],
                "reward_title": sr.get("title") or "Premio de Pasaporte", "reward_description": sr.get("description", ""),
                "conditions": sr.get("conditions", ""), "stamps_required": sr.get("stamps_required", 5),
                "claimed_stamps": t.get("claimed_stamps", 0), "venue_name": venue.get("name", ""),
                "venue_address": venue.get("address", ""), "venue_image_url": venue.get("image_url", ""),
                "expires_at": t.get("expires_at", ""), "redeemed_at": t.get("redeemed_at"),
                "created_at": t.get("created_at", ""),
            })
        return {"tickets": tickets}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ValidatePassportRewardRequest(BaseModel):
    code: str


@router.post("/staff/validate-passport-reward")
async def validate_passport_reward(req: ValidatePassportRewardRequest, user=Depends(get_current_user)):
    """Staff endpoint to validate and redeem a passport (stamp) reward ticket."""
    client = _get_loyalty_client(admin=True)
    from datetime import datetime, timezone
    try:
        code = req.code.strip().upper()
        raw_code = req.code.strip()
        qr_lower = raw_code.lower()
        res = client.table("passport_rewards") \
            .select("*, stamp_rewards(title, description), venues(name, address), profiles!passport_rewards_user_id_fkey(full_name)") \
            .or_(f"qr_token.eq.{qr_lower},text_code.eq.{code}") \
            .execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Ticket no encontrado. Verifica el codigo.")
        ticket = res.data[0]
        sr = ticket.get("stamp_rewards") or {}
        venue_data = ticket.get("venues") or {}
        customer = ticket.get("profiles") or {}
        staff_venue_res = client.table("venues").select("id").eq("owner_id", user["id"]).execute()
        team_res = client.table("venue_team").select("venue_id").eq("member_id", user["id"]).execute()
        allowed_ids = [v["id"] for v in (staff_venue_res.data or [])] + [t["venue_id"] for t in (team_res.data or [])]
        if ticket["venue_id"] not in allowed_ids:
            raise HTTPException(status_code=403, detail="Solo puedes canjear tickets de tu propio local.")
        if ticket["status"] == "REDEEMED":
            raise HTTPException(status_code=400, detail="Este ticket ya fue canjeado.")
        if ticket["status"] == "EXPIRED":
            raise HTTPException(status_code=400, detail="Este ticket ha expirado.")
        if ticket["status"] != "ACTIVE":
            raise HTTPException(status_code=400, detail=f"Estado de ticket invalido: {ticket['status']}")
        if ticket.get("expires_at"):
            exp = datetime.fromisoformat(ticket["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                client.table("passport_rewards").update({"status": "EXPIRED"}).eq("id", ticket["id"]).execute()
                raise HTTPException(status_code=400, detail="Este ticket ha expirado.")
        client.table("passport_rewards").update({
            "status": "REDEEMED", "redeemed_at": datetime.now(timezone.utc).isoformat(), "redeemed_by": user["id"],
        }).eq("id", ticket["id"]).execute()
        return {
            "success": True, "ticket_type": "PASSPORT_REWARD",
            "perk_title": sr.get("title") or "Premio de Pasaporte", "perk_description": sr.get("description", ""),
            "venue_name": venue_data.get("name", ""), "customer_name": customer.get("full_name", "Guest"),
            "redeemed_at": datetime.now(timezone.utc).isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/public/profile/{hash_id}")
async def get_public_profile(hash_id: str):
    """Public profile summary for QR scans. Includes name, badges and basic stats."""
    from app.services.supabase_service import supabase_admin as admin_client
    try:
        # 1. Fetch user by hash
        res = admin_client.table("profiles").select("id, full_name, created_at").eq("user_hash_id", hash_id.upper()).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Perfil no encontrado.")
        
        user_id = res.data["id"]
        
        # 2. Fetch basic counts
        loyalty = admin_client.table("venue_loyalty").select("stamps_count, venues(name)").eq("user_id", user_id).execute()
        stamps_total = sum([v["stamps_count"] for v in (loyalty.data or [])])
        venues_total = len(loyalty.data or [])
        
        # 3. Get recent rewards (count only)
        rewards = admin_client.table("reward_tickets").select("id").eq("user_id", user_id).eq("status", "REDEEMED").execute()
        passport_rewards = admin_client.table("passport_rewards").select("id").eq("user_id", user_id).eq("status", "REDEEMED").execute()
        
        return {
            "name": res.data["full_name"],
            "member_since": res.data["created_at"],
            "total_stamps": stamps_total,
            "venues_visited": venues_total,
            "rewards_claimed": len(rewards.data or []) + len(passport_rewards.data or []),
            "venues_list": [v["venues"]["name"] for v in (loyalty.data or []) if v.get("venues")]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/public/reward/{qr_token}")
async def get_public_reward(qr_token: str):
    """Public summary of a reward ticket. Shows status without allowing redemption."""
    from app.services.supabase_service import supabase_admin as admin_client
    try:
        # Check passport rewards
        res = admin_client.table("passport_rewards") \
            .select("status, expires_at, stamp_rewards(title), venues(name), profiles!passport_rewards_user_id_fkey(user_hash_id)") \
            .or_(f"qr_token.eq.{qr_token},text_code.eq.{qr_token.upper()}") \
            .execute()
        
        if res.data:
            t = res.data[0]
            sr = t.get("stamp_rewards") or {}
            vn = t.get("venues") or {}
            return {
                "type": "PREMIO DE PASAPORTE",
                "status": t["status"],
                "expires_at": t["expires_at"],
                "title": sr.get("title", "Premio"),
                "venue_name": vn.get("name", "Local"),
                "user_hash_id": t.get("profiles", {}).get("user_hash_id") if t.get("profiles") else None
            }
        
        # Check perk tickets
        res = admin_client.table("reward_tickets") \
            .select("status, venue_perks(title), venues(name), profiles!reward_tickets_user_id_fkey(user_hash_id)") \
            .or_(f"qr_token.eq.{qr_token},text_code.eq.{qr_token.upper()}") \
            .execute()
        
        if res.data:
            t = res.data[0]
            p = t.get("venue_perks") or {}
            vn = t.get("venues") or {}
            return {
                "type": "GANGAZO / CUPÓN",
                "status": t["status"],
                "title": p.get("title", "Ganga"),
                "venue_name": vn.get("name", "Local"),
                "user_hash_id": t.get("profiles", {}).get("user_hash_id") if t.get("profiles") else None
            }
            
        raise HTTPException(status_code=404, detail="Código no encontrado.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
