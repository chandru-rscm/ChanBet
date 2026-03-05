from fastapi import APIRouter
from app.services.sports_api import get_live_matches

router = APIRouter()

@router.get("/live")
async def live_matches(sport: str):
    matches = await get_live_matches(sport)
    return {"status": "ok", "matches": matches}
