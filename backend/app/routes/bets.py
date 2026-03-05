from fastapi import APIRouter
from app.models.schemas import PlaceBet, ResolveBet
from app.services.supabase_service import place_bet, get_bets_by_room, resolve_bets

router = APIRouter()

@router.post("/place")
def place(body: PlaceBet):
    bet = place_bet(body.userId, body.roomCode, body.matchId, body.betOn, body.amount)
    return {"status": "ok", "bet": bet}

@router.get("/{room_code}")
def get_bets(room_code: str):
    bets = get_bets_by_room(room_code)
    return {"status": "ok", "bets": bets}

@router.post("/resolve")
def resolve(body: ResolveBet):
    resolved = resolve_bets(body.matchId, body.winner)
    return {"status": "ok", "resolved": resolved}
