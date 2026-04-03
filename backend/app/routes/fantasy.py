from fastapi import APIRouter, HTTPException
from app.services.fantasy_service import (
    create_fantasy_room, join_fantasy_room, get_fantasy_room,
    get_fantasy_players, assign_teams, get_auction_players,
    set_active_player, place_bid, get_highest_bid,
    sell_player, mark_unsold, get_squad, get_team_budget_spent
)
from app.services.player_pool import seed_players, SPORT_BUDGET, SPORT_SQUAD_SIZE
from app.services.supabase_service import supabase
from app.sockets.events import sio
import random

router = APIRouter()

@router.post("/create")
def create(data: dict):
    room = create_fantasy_room(data["hostId"], data["sport"])
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
    return {"status": "ok", "players": get_fantasy_players(room_code)}

@router.post("/{room_code}/teams")
async def set_teams(room_code: str, data: dict):
    assign_teams(room_code, data["teamA"], data["teamB"])
    await sio.emit("teams_set", {}, room=room_code)
    return {"status": "ok"}

@router.post("/{room_code}/pick-team")
async def pick_team(room_code: str, data: dict):
    supabase.table("fantasy_room_players").update({"team": data["team"]}).eq("room_code", room_code).eq("user_id", data["userId"]).execute()
    await sio.emit("fantasy_room_updated", {}, room=room_code)
    return {"status": "ok"}

@router.get("/{room_code}/auction/players")
def auction_players(room_code: str):
    players = get_auction_players(room_code)
    room = get_fantasy_room(room_code)
    return {
        "status": "ok",
        "players": players,
        "budget": SPORT_BUDGET.get(room["sport"], 12000000000),
        "squad_size": SPORT_SQUAD_SIZE.get(room["sport"], 11)
    }

@router.post("/{room_code}/auction/start")
async def start_auction(room_code: str, data: dict = {}):
    timer_duration = data.get("timerDuration", 15)
    players = get_auction_players(room_code)
    pending = [p for p in players if p["status"] == "pending"]
    if not pending:
        return {"status": "ok", "message": "No players"}

    # Shuffle for randomness!
    random.shuffle(pending)

    # Reassign order in DB by updating a sort field
    for i, p in enumerate(pending):
        supabase.table("auction_players").update({"sort_order": i}).eq("id", p["id"]).execute()

    first = pending[0]
    set_active_player(room_code, first["id"])
    await sio.emit("auction_next", {"player": first, "timerDuration": timer_duration}, room=room_code)
    return {"status": "ok", "player": first}

@router.post("/{room_code}/auction/set-timer")
async def set_timer(room_code: str, data: dict):
    duration = data.get("duration", 15)
    await sio.emit("timer_updated", {"duration": duration}, room=room_code)
    return {"status": "ok"}

@router.post("/{room_code}/auction/bid")
async def bid(room_code: str, data: dict):
    player_id = data["playerId"]
    team = data["team"]
    amount = data["amount"]
    user_id = data["userId"]
    timer_duration = data.get("timerDuration", 15)

    spent = get_team_budget_spent(room_code, team)
    room = get_fantasy_room(room_code)
    budget = SPORT_BUDGET.get(room["sport"], 12000000000)
    if spent + amount > budget:
        raise HTTPException(status_code=400, detail="Budget exceeded!")

    current_highest = get_highest_bid(player_id)
    if current_highest and current_highest["amount"] >= amount:
        raise HTTPException(status_code=400, detail="Bid too low!")

    place_bid(room_code, player_id, team, amount, user_id)
    highest = get_highest_bid(player_id)

    await sio.emit("bid_placed", {
        "playerId": player_id,
        "team": team,
        "amount": amount,
        "userName": data.get("userName"),
        "timerDuration": timer_duration,
        "highest": {"team": highest["team"], "amount": highest["amount"]} if highest else None
    }, room=room_code)

    return {"status": "ok"}

@router.post("/{room_code}/auction/sell")
async def sell(room_code: str, data: dict):
    player_id = data["playerId"]
    highest = get_highest_bid(player_id)
    players = get_auction_players(room_code)
    player = next((p for p in players if p["id"] == player_id), None)
    base_price = player["base_price"] if player else 0
    timer_duration = data.get("timerDuration", 15)

    if highest:
        sell_player(player_id, highest["team"], highest["amount"], room_code)
        ratio = highest["amount"] / base_price if base_price else 1
        steal_label = "🔥 STEAL!" if ratio <= 1.2 else ("💰 FAIR DEAL" if ratio <= 2 else "💸 BIG SPEND!")
        await sio.emit("player_sold", {
            "playerId": player_id,
            "playerName": player["player_name"] if player else "Player",
            "team": highest["team"],
            "amount": highest["amount"],
            "basePrice": base_price,
            "stealLabel": steal_label,
        }, room=room_code)
    else:
        mark_unsold(player_id)
        await sio.emit("player_unsold", {
            "playerId": player_id,
            "playerName": player["player_name"] if player else "Player"
        }, room=room_code)

    # Auto advance to next pending
    updated = get_auction_players(room_code)
    pending = [p for p in updated if p["status"] == "pending"]
    if pending:
        nxt = pending[0]
        set_active_player(room_code, nxt["id"])
        await sio.emit("auction_next", {"player": nxt, "timerDuration": timer_duration}, room=room_code)
    else:
        supabase.table("fantasy_rooms").update({"status": "simulation"}).eq("room_code", room_code).execute()
        await sio.emit("auction_complete", {}, room=room_code)

    return {"status": "ok"}

@router.post("/{room_code}/auction/end")
async def end_auction(room_code: str):
    players = get_auction_players(room_code)
    for p in players:
        if p["status"] in ["pending", "active"]:
            mark_unsold(p["id"])
    supabase.table("fantasy_rooms").update({"status": "simulation"}).eq("room_code", room_code).execute()
    await sio.emit("auction_ended", {}, room=room_code)
    return {"status": "ok"}

@router.get("/{room_code}/squad/{team}")
def squad(room_code: str, team: str):
    result = get_squad(room_code, team)
    spent = get_team_budget_spent(room_code, team)
    room = get_fantasy_room(room_code)
    sport = room["sport"]
    return {
        "status": "ok", "squad": result, "spent": spent,
        "budget": SPORT_BUDGET.get(sport, 12000000000),
        "squad_size": SPORT_SQUAD_SIZE.get(sport, 11)
    }