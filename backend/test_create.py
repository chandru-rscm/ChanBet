import sys
import os

# Add parent directory to path so app imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.supabase_service import supabase
from app.services.fantasy_service import create_fantasy_room
from app.services.player_pool import seed_players

try:
    print("Testing connection to Supabase...")
    user_res = supabase.table("users").select("*").limit(1).execute()
    print("Supabase connection successful. Active Users count:", len(user_res.data))
    
    # Get a dummy or first user ID
    if len(user_res.data) > 0:
        host_id = user_res.data[0]["id"]
    else:
        # Create a temp user
        print("No users found. Creating a temp user...")
        temp_user = {"id": "temp_test_user", "name": "Test Bot", "avatar": "🤖", "coins": 1000}
        supabase.table("users").insert(temp_user).execute()
        host_id = "temp_test_user"

    print(f"Creating a fantasy room with host_id={host_id}...")
    room = create_fantasy_room(host_id, "cricket", "dual_franchise")
    print("Room created successfully:", room)
    
    print("Seeding players...")
    num_players = seed_players(room["room_code"], "cricket")
    print(f"Seeding successful! Seeded {num_players} players.")
    
except Exception as e:
    import traceback
    print("--- ERROR OCCURRED ---")
    traceback.print_exc()
