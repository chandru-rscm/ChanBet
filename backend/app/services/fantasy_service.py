from app.services.supabase_service import supabase
import random
import string

def generate_room_code():
    return "F" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

# ─── ROOMS ───────────────────────────────────────

def create_fantasy_room(host_id: str, sport: str):
    code = generate_room_code()
    room = {"room_code": code, "host_id": host_id, "sport": sport, "status": "waiting"}
    result = supabase.table("fantasy_rooms").insert(room).execute()
    supabase.table("fantasy_room_players").insert({"room_code": code, "user_id": host_id}).execute()
    return result.data[0]

def join_fantasy_room(room_code: str, user_id: str):
    room = supabase.table("fantasy_rooms").select("*").eq("room_code", room_code).execute()
    if not room.data:
        return None
    existing = supabase.table("fantasy_room_players").select("*").eq("room_code", room_code).eq("user_id", user_id).execute()
    if not existing.data:
        supabase.table("fantasy_room_players").insert({"room_code": room_code, "user_id": user_id}).execute()
    return room.data[0]

def get_fantasy_room(room_code: str):
    result = supabase.table("fantasy_rooms").select("*").eq("room_code", room_code).execute()
    return result.data[0] if result.data else None

def get_fantasy_players(room_code: str):
    result = supabase.table("fantasy_room_players").select("*, users(*)").eq("room_code", room_code).execute()
    return result.data

# ─── TEAM SPLIT ──────────────────────────────────

def assign_teams(room_code: str, team_a: list, team_b: list):
    for user_id in team_a:
        supabase.table("fantasy_room_players").update({"team": "A"}).eq("room_code", room_code).eq("user_id", user_id).execute()
    for user_id in team_b:
        supabase.table("fantasy_room_players").update({"team": "B"}).eq("room_code", room_code).eq("user_id", user_id).execute()
    supabase.table("fantasy_rooms").update({"status": "auction"}).eq("room_code", room_code).execute()
    return True

# ─── AUCTION ─────────────────────────────────────

def get_auction_players(room_code: str):
    result = supabase.table("auction_players").select("*").eq("room_code", room_code).order("id").execute()
    return result.data

def get_active_player(room_code: str):
    result = supabase.table("auction_players").select("*").eq("room_code", room_code).eq("status", "active").execute()
    return result.data[0] if result.data else None

def set_active_player(room_code: str, player_id: int):
    # Reset previous active to pending
    supabase.table("auction_players").update({"status": "pending"}).eq("room_code", room_code).eq("status", "active").execute()
    # Set new active
    supabase.table("auction_players").update({"status": "active"}).eq("id", player_id).execute()
    return True

def place_bid(room_code: str, player_id: int, team: str, amount: int, user_id: str):
    bid = {"room_code": room_code, "player_id": player_id, "team": team, "amount": amount, "user_id": user_id}
    result = supabase.table("auction_bids").insert(bid).execute()
    return result.data[0]

def get_highest_bid(player_id: int):
    result = supabase.table("auction_bids").select("*").eq("player_id", player_id).order("amount", desc=True).limit(1).execute()
    return result.data[0] if result.data else None

def sell_player(player_id: int, team: str, amount: int, room_code: str):
    supabase.table("auction_players").update({"status": "sold", "sold_to": team, "sold_price": amount}).eq("id", player_id).execute()
    # Add to squad
    player = supabase.table("auction_players").select("*").eq("id", player_id).execute().data[0]
    supabase.table("fantasy_squads").insert({
        "room_code": room_code, "team": team, "player_id": player_id,
        "player_name": player["player_name"], "role": player["role"], "bought_for": amount
    }).execute()
    return True

def mark_unsold(player_id: int):
    supabase.table("auction_players").update({"status": "unsold"}).eq("id", player_id).execute()

def get_squad(room_code: str, team: str):
    result = supabase.table("fantasy_squads").select("*").eq("room_code", room_code).eq("team", team).execute()
    return result.data

def get_team_budget_spent(room_code: str, team: str):
    squad = get_squad(room_code, team)
    return sum(p["bought_for"] or 0 for p in squad)