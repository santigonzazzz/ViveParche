"""
Venue Reviews router for Parché App.
Allows logged-in users who have visited a venue to leave reviews.
Users are rewarded 50 Parché coins per review.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from app.dependencies import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    message: Optional[str] = Field(None, max_length=500)


@router.get("/venue/{venue_id}")
async def get_venue_reviews(venue_id: str, limit: int = 20, offset: int = 0):
    """Get public reviews for a venue. Only exposes: name, stars, date, message."""
    from app.services.supabase_service import supabase_admin as admin_client
    try:
        res = admin_client.table("venue_reviews") \
            .select("id, rating, comment, created_at, user_id") \
            .eq("venue_id", venue_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        reviews = res.data or []

        # Fetch only the display name for each reviewer
        user_ids = list(set(r["user_id"] for r in reviews if r.get("user_id")))
        profiles_map = {}
        if user_ids:
            prof_res = admin_client.table("profiles") \
                .select("id, full_name") \
                .in_("id", user_ids) \
                .execute()
            profiles_map = {p["id"]: p.get("full_name", "Parcero Anónimo") for p in (prof_res.data or [])}

        return [
            {
                "id": r["id"],
                "reviewer_name": profiles_map.get(r["user_id"], "Parcero Anónimo"),
                "stars": r.get("rating"),
                "message": r.get("comment", ""),
                "created_at": r["created_at"],
            }
            for r in reviews
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/venue/{venue_id}/stats")
async def get_venue_review_stats(venue_id: str):
    """Get average rating and total reviews count for a venue."""
    from app.services.supabase_service import supabase_admin as admin_client
    try:
        res = admin_client.table("venue_reviews") \
            .select("rating") \
            .eq("venue_id", venue_id) \
            .execute()

        reviews = res.data or []
        total = len(reviews)
        avg = round(sum(r.get("rating", 0) for r in reviews) / total, 1) if total > 0 else 0.0

        # Distribution
        dist = {str(i): 0 for i in range(1, 6)}
        for r in reviews:
            dist[str(r.get("rating", 0))] += 1

        return {"avg_stars": avg, "total_reviews": total, "distribution": dist}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/venue/{venue_id}")
async def create_venue_review(venue_id: str, review: ReviewCreate, user=Depends(get_current_user)):
    """
    Leave a review for a venue.
    Requirements:
    - User must be logged in.
    - User must have at least one visit registered (visit_log entry).
    - Only one review per user per venue per calendar month.
    - Reward: 50 Parché Coins added to user wallet.
    """
    from app.services.supabase_service import supabase_admin as admin_client, supabase_admin
    from datetime import datetime, timezone

    client = supabase_admin if supabase_admin else supabase

    try:
        user_id = user["id"]

        # 1. Check venue exists
        venue_res = client.table("venues").select("id, name, rating").eq("id", venue_id).single().execute()
        if not venue_res.data:
            raise HTTPException(status_code=404, detail="Local no encontrado.")

        # 2. Verify the user has visited this venue at least once (via visit_log / flash code)
        visit_res = client.table("visit_log").select("id") \
            .eq("venue_id", venue_id) \
            .eq("user_id", user_id) \
            .limit(1) \
            .execute()

        if not visit_res.data:
            raise HTTPException(
                status_code=403,
                detail="Para dejar una reseña, primero debes haber visitado este local y escaneado el Flash Code."
            )

        # 3. One review per user per venue per calendar month
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

        existing_res = client.table("venue_reviews") \
            .select("id") \
            .eq("venue_id", venue_id) \
            .eq("user_id", user_id) \
            .gte("created_at", month_start) \
            .limit(1) \
            .execute()

        if existing_res.data:
            raise HTTPException(
                status_code=409,
                detail="Ya dejaste una reseña para este local este mes. Puedes volver a opinar el próximo mes."
            )

        # 4. Insert review
        review_data = {
            "venue_id": venue_id,
            "user_id": user_id,
            "rating": review.stars,
            "comment": review.message,
        }
        insert_res = client.table("venue_reviews").insert(review_data).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Error al guardar tu reseña. Intenta de nuevo.")

        # 5. Award 50 Parché Coins (vibecoins)
        REVIEW_COIN_REWARD = 50
        prof_res = client.table("profiles").select("vibecoins").eq("id", user_id).single().execute()
        current_coins = (prof_res.data or {}).get("vibecoins", 0)
        client.table("profiles").update({"vibecoins": current_coins + REVIEW_COIN_REWARD}).eq("id", user_id).execute()

        # 6. Recalculate venue average rating and update venues table
        all_stars_res = client.table("venue_reviews").select("rating").eq("venue_id", venue_id).execute()
        all_stars = all_stars_res.data or []
        if all_stars:
            new_avg = round(sum(r.get("rating", 0) for r in all_stars) / len(all_stars), 2)
            client.table("venues").update({"rating": new_avg}).eq("id", venue_id).execute()

        return {
            "success": True,
            "message": f"¡Gracias por tu reseña! Recibiste {REVIEW_COIN_REWARD} Parché Coins.",
            "coins_awarded": REVIEW_COIN_REWARD,
            "review": insert_res.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"REVIEW CREATE ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
