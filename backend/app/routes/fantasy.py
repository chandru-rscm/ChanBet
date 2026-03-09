from fastapi import APIRouter, HTTPException
from app.services.fantasy_service import (
    create_fantasy_room, join_fantasy_room, get_fantasy_room,
    get_fantasy_players, assign_teams, get_auction_players,
    get_active_player, set_active_player, place_bid,
    get_highest_bid, sell_player, mark_unsold,
    get_squad, get_team_budget_spent
)
from app.services.player_pool import seed_players, SPORT_BUDGET, SPORT_SQUAD_SIZE
from app.sockets.events import sio

router = APIRouter()

# ─── ROOM ─────────────────────────────────────────

@router.post("/create")
def create(data: dict):
    room = create_fantasy_room(data["hostId"], data["sport"])
    # Seed player pool for this sport
    seed_players(room["room_code"], data["sport"])
    return {"status": "ok", "room": room}

@router.post("/join")
def join(data: dict):
    room = join_fantasy_room(data["roomCode"], data["userId"])
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"status": "ok", "room": room}

@router.get("/{room_code}")
def get_room(room_code: str):
    room = get_fantasy_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"status": "ok", "room": room}

@router.get("/{room_code}/players")
def players(room_code: str):
    result = get_fantasy_players(room_code)
    return {"status": "ok", "players": result}

# ─── TEAMS ────────────────────────────────────────

@router.post("/{room_code}/teams")
async def set_teams(room_code: str, data: dict):
    assign_teams(room_code, data["teamA"], data["teamB"])
    await sio.emit("teams_set", {"teamA": data["teamA"], "teamB": data["teamB"]}, room=room_code)
    return {"status": "ok"}

# ─── AUCTION ──────────────────────────────────────

@router.get("/{room_code}/auction/players")
def auction_players(room_code: str):
    players = get_auction_players(room_code)
    room = get_fantasy_room(room_code)
    sport = room["sport"]
    return {
        "status": "ok",
        "players": players,
        "budget": SPORT_BUDGET.get(sport, 12000000000),
        "squad_size": SPORT_SQUAD_SIZE.get(sport, 11)
    }

@router.post("/{room_code}/auction/next")
async def next_player(room_code: str, data: dict):
    player_id = data.get("playerId")
    set_active_player(room_code, player_id)
    players = get_auction_players(room_code)
    player = next((p for p in players if p["id"] == player_id), None)
    await sio.emit("auction_next", {"player": player}, room=room_code)
    return {"status": "ok", "player": player}

@router.post("/{room_code}/auction/bid")
async def bid(room_code: str, data: dict):
    player_id = data["playerId"]
    team = data["team"]
    amount = data["amount"]
    user_id = data["userId"]

    # Check budget
    spent = get_team_budget_spent(room_code, team)
    room = get_fantasy_room(room_code)
    budget = SPORT_BUDGET.get(room["sport"], 12000000000)
    if spent + amount > budget:
        raise HTTPException(status_code=400, detail="Budget exceeded!")

    bid = place_bid(room_code, player_id, team, amount, user_id)
    highest = get_highest_bid(player_id)

    await sio.emit("bid_placed", {
        "playerId": player_id,
        "team": team,
        "amount": amount,
        "userName": data.get("userName"),
        "highest": highest
    }, room=room_code)

    return {"status": "ok", "bid": bid, "highest": highest}

@router.post("/{room_code}/auction/sell")
async def sell(room_code: str, data: dict):
    player_id = data["playerId"]
    highest = get_highest_bid(player_id)

    if highest:
        sell_player(player_id, highest["team"], highest["amount"], room_code)
        await sio.emit("player_sold", {
            "playerId": player_id,
            "team": highest["team"],
            "amount": highest["amount"]
        }, room=room_code)
    else:
        mark_unsold(player_id)
        await sio.emit("player_unsold", {"playerId": player_id}, room=room_code)

    return {"status": "ok"}

@router.get("/{room_code}/squad/{team}")
def squad(room_code: str, team: str):
    result = get_squad(room_code, team)
    spent = get_team_budget_spent(room_code, team)
    room = get_fantasy_room(room_code)
    budget = SPORT_BUDGET.get(room["sport"], 12000000000)
    return {"status": "ok", "squad": result, "spent": spent, "budget": budget}