from supabase import create_client
from app.config import SUPABASE_URL, SUPABASE_KEY

# Single Supabase client used across all services
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── USERS ───────────────────────────────────────

def create_or_get_user(user_id: str, name: str, avatar: str):
    # Check if user already exists
    existing = supabase.table("users").select("*").eq("id", user_id).execute()
    if existing.data:
        return existing.data[0]
    # Create new user with 1000 starting coins
    new_user = {"id": user_id, "name": name, "avatar": avatar, "coins": 1000}
    result = supabase.table("users").insert(new_user).execute()
    return result.data[0]


# ─── ROOMS ───────────────────────────────────────

def create_room(room_code: str, host_id: str):
    room = {
        "room_code": room_code,
        "host_id": host_id,
        "status": "waiting",
        "sport": None,
        "match_id": None,
    }
    result = supabase.table("rooms").insert(room).execute()
    # Add host as first player
    supabase.table("room_players").insert({"room_code": room_code, "user_id": host_id}).execute()
    return result.data[0]


def join_room(room_code: str, user_id: str):
    # Check room exists
    room = supabase.table("rooms").select("*").eq("room_code", room_code).execute()
    if not room.data:
        return None
    # Add player if not already in
    existing = supabase.table("room_players").select("*").eq("room_code", room_code).eq("user_id", user_id).execute()
    if not existing.data:
        supabase.table("room_players").insert({"room_code": room_code, "user_id": user_id}).execute()
    return room.data[0]


def get_room_players(room_code: str):
    result = supabase.table("room_players").select("*, users(*)").eq("room_code", room_code).execute()
    return result.data


# ─── BETS ────────────────────────────────────────

def place_bet(user_id: str, room_code: str, match_id: str, bet_on: str, amount: int):
    bet = {
        "user_id": user_id,
        "room_code": room_code,
        "match_id": match_id,
        "bet_on": bet_on,
        "amount": amount,
        "status": "pending",
    }
    result = supabase.table("bets").insert(bet).execute()
    return result.data[0]


def get_bets_by_room(room_code: str):
    result = supabase.table("bets").select("*, users(name, avatar)").eq("room_code", room_code).execute()
    return result.data


def resolve_bets(match_id: str, winner: str):
    # Get all pending bets for this match
    bets = supabase.table("bets").select("*").eq("match_id", match_id).eq("status", "pending").execute()
    resolved = []

    for bet in bets.data:
        won = bet["bet_on"] == winner

        # Update bet status
        supabase.table("bets").update({"status": "won" if won else "lost"}).eq("id", bet["id"]).execute()

        # Update user coins
        user = supabase.table("users").select("coins").eq("id", bet["user_id"]).execute().data[0]
        new_coins = user["coins"] + bet["amount"] * 2 if won else user["coins"] - bet["amount"]
        supabase.table("users").update({"coins": new_coins}).eq("id", bet["user_id"]).execute()

        resolved.append({**bet, "status": "won" if won else "lost"})

    return resolved
