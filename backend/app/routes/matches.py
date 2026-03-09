from fastapi import APIRouter
from app.services.sports_api import get_live_matches

router = APIRouter()

@router.get("/live")
async def live_matches(sport: str):
    matches = await get_live_matches(sport)
    return {"status": "ok", "matches": matches}

@router.get("/score")
async def match_score(sport: str, matchId: str):
    matches = await get_live_matches(sport)
    for m in matches:
        mid = str(m.get("fixture", {}).get("id") or m.get("id", ""))
        if mid == matchId:
            score = {
                "scoreA": m.get("goals", {}).get("home") or m.get("scores", {}).get("home", "-"),
                "scoreB": m.get("goals", {}).get("away") or m.get("scores", {}).get("away", "-"),
                "status": m.get("fixture", {}).get("status", {}).get("long") or m.get("status", "Live"),
            }
            return {"status": "ok", "score": score}
    return {"status": "ok", "score": None}