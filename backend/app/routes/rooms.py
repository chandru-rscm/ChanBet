from fastapi import APIRouter, HTTPException
from app.models.schemas import CreateRoom, JoinRoom
from app.services.supabase_service import create_room, join_room, get_room_players, supabase
import random
import string

router = APIRouter()

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create")
def create(body: CreateRoom):
    room_code = generate_room_code()
    room = create_room(room_code, body.hostId)
    return {"status": "ok", "room": room}

@router.post("/join")
def join(body: JoinRoom):
    room = join_room(body.roomCode, body.userId)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"status": "ok", "room": room}

@router.get("/{room_code}/players")
def players(room_code: str):
    result = get_room_players(room_code)
    return {"status": "ok", "players": result}

@router.post("/set-match")
def set_match(data: dict):
    room_code = data.get("roomCode")
    supabase.table("rooms").update({
        "match_id": data.get("matchId"),
        "sport": data.get("sport"),
        "team_a": data.get("teamA"),
        "team_b": data.get("teamB"),
        "status": "live"
    }).eq("room_code", room_code).execute()
    return {"status": "ok"}