from app.services.supabase_service import supabase

CR = 10_000_000

CRICKET_PLAYERS = [
    {"player_name": "Virat Kohli",        "role": "Batsman",      "overseas": False, "base_price": 2*CR,       "stats": {"avg": 52.7, "sr": 139.1, "recent_runs": 450}},
    {"player_name": "Rohit Sharma",       "role": "Batsman",      "overseas": False, "base_price": 2*CR,       "stats": {"avg": 48.2, "sr": 140.5, "recent_runs": 380}},
    {"player_name": "Jasprit Bumrah",     "role": "Bowler",       "overseas": False, "base_price": 2*CR,       "stats": {"avg": 19.4, "economy": 6.7, "recent_wickets": 18}},
    {"player_name": "MS Dhoni",           "role": "Wicketkeeper", "overseas": False, "base_price": 2*CR,       "stats": {"avg": 38.1, "sr": 135.2, "recent_runs": 210}},
    {"player_name": "Hardik Pandya",      "role": "All-rounder",  "overseas": False, "base_price": 2*CR,       "stats": {"avg": 33.5, "sr": 147.8, "recent_runs": 290}},
    {"player_name": "Suryakumar Yadav",   "role": "Batsman",      "overseas": False, "base_price": 2*CR,       "stats": {"avg": 44.1, "sr": 184.2, "recent_runs": 410}},
    {"player_name": "Rishabh Pant",       "role": "Wicketkeeper", "overseas": False, "base_price": 2*CR,       "stats": {"avg": 35.8, "sr": 151.3, "recent_runs": 280}},
    {"player_name": "Jos Buttler",        "role": "Wicketkeeper", "overseas": True,  "base_price": 2*CR,       "stats": {"avg": 48.5, "sr": 149.8, "recent_runs": 430}},
    {"player_name": "Pat Cummins",        "role": "All-rounder",  "overseas": True,  "base_price": 2*CR,       "stats": {"avg": 27.3, "economy": 8.2, "recent_wickets": 13}},
    {"player_name": "Rashid Khan",        "role": "Bowler",       "overseas": True,  "base_price": 2*CR,       "stats": {"avg": 17.2, "economy": 6.3, "recent_wickets": 20}},
    {"player_name": "Mitchell Starc",     "role": "Bowler",       "overseas": True,  "base_price": 2*CR,       "stats": {"avg": 21.3, "economy": 8.5, "recent_wickets": 16}},
    {"player_name": "KL Rahul",           "role": "Batsman",      "overseas": False, "base_price": 1*CR,       "stats": {"avg": 45.6, "sr": 136.2, "recent_runs": 340}},
    {"player_name": "Mohammed Shami",     "role": "Bowler",       "overseas": False, "base_price": 1*CR,       "stats": {"avg": 22.1, "economy": 7.8, "recent_wickets": 15}},
    {"player_name": "Shubman Gill",       "role": "Batsman",      "overseas": False, "base_price": 1*CR,       "stats": {"avg": 46.3, "sr": 141.2, "recent_runs": 390}},
    {"player_name": "Ravindra Jadeja",    "role": "All-rounder",  "overseas": False, "base_price": 1*CR,       "stats": {"avg": 29.3, "sr": 130.0, "recent_runs": 180}},
    {"player_name": "Kuldeep Yadav",      "role": "Bowler",       "overseas": False, "base_price": 1*CR,       "stats": {"avg": 24.5, "economy": 8.1, "recent_wickets": 14}},
    {"player_name": "Shreyas Iyer",       "role": "Batsman",      "overseas": False, "base_price": 1*CR,       "stats": {"avg": 40.2, "sr": 132.1, "recent_runs": 310}},
    {"player_name": "Yashasvi Jaiswal",   "role": "Batsman",      "overseas": False, "base_price": 1*CR,       "stats": {"avg": 43.7, "sr": 145.3, "recent_runs": 360}},
    {"player_name": "R Ashwin",           "role": "Bowler",       "overseas": False, "base_price": 1*CR,       "stats": {"avg": 25.6, "economy": 6.9, "recent_wickets": 16}},
    {"player_name": "David Warner",       "role": "Batsman",      "overseas": True,  "base_price": 1*CR,       "stats": {"avg": 41.5, "sr": 142.7, "recent_runs": 320}},
    {"player_name": "Faf du Plessis",     "role": "Batsman",      "overseas": True,  "base_price": 1*CR,       "stats": {"avg": 39.8, "sr": 138.4, "recent_runs": 300}},
    {"player_name": "Quinton de Kock",    "role": "Wicketkeeper", "overseas": True,  "base_price": 1*CR,       "stats": {"avg": 42.1, "sr": 144.2, "recent_runs": 350}},
    {"player_name": "Trent Boult",        "role": "Bowler",       "overseas": True,  "base_price": 1*CR,       "stats": {"avg": 23.7, "economy": 8.1, "recent_wickets": 13}},
    {"player_name": "Sunil Narine",       "role": "All-rounder",  "overseas": True,  "base_price": 1*CR,       "stats": {"avg": 26.5, "economy": 6.7, "recent_wickets": 11}},
    {"player_name": "Axar Patel",         "role": "All-rounder",  "overseas": False, "base_price": 75*CR//100, "stats": {"avg": 26.4, "economy": 7.3, "recent_wickets": 10}},
    {"player_name": "Ishan Kishan",       "role": "Wicketkeeper", "overseas": False, "base_price": 75*CR//100, "stats": {"avg": 31.2, "sr": 138.5, "recent_runs": 240}},
    {"player_name": "Arshdeep Singh",     "role": "Bowler",       "overseas": False, "base_price": 75*CR//100, "stats": {"avg": 28.3, "economy": 8.5, "recent_wickets": 11}},
    {"player_name": "Ruturaj Gaikwad",    "role": "Batsman",      "overseas": False, "base_price": 75*CR//100, "stats": {"avg": 38.4, "sr": 136.8, "recent_runs": 270}},
    {"player_name": "Sanju Samson",       "role": "Wicketkeeper", "overseas": False, "base_price": 75*CR//100, "stats": {"avg": 33.7, "sr": 145.1, "recent_runs": 250}},
    {"player_name": "Nicholas Pooran",    "role": "Wicketkeeper", "overseas": True,  "base_price": 75*CR//100, "stats": {"avg": 29.4, "sr": 157.3, "recent_runs": 220}},
    {"player_name": "Liam Livingstone",   "role": "All-rounder",  "overseas": True,  "base_price": 75*CR//100, "stats": {"avg": 28.7, "sr": 162.4, "recent_runs": 190}},
    {"player_name": "Heinrich Klaasen",   "role": "Wicketkeeper", "overseas": True,  "base_price": 75*CR//100, "stats": {"avg": 34.2, "sr": 155.8, "recent_runs": 230}},
    {"player_name": "Rinku Singh",        "role": "Batsman",      "overseas": False, "base_price": 50*CR//100, "stats": {"avg": 37.8, "sr": 163.2, "recent_runs": 180}},
    {"player_name": "Tilak Varma",        "role": "Batsman",      "overseas": False, "base_price": 50*CR//100, "stats": {"avg": 35.1, "sr": 149.6, "recent_runs": 200}},
    {"player_name": "Deepak Chahar",      "role": "Bowler",       "overseas": False, "base_price": 50*CR//100, "stats": {"avg": 29.1, "economy": 7.9, "recent_wickets": 9}},
    {"player_name": "Yuzvendra Chahal",   "role": "Bowler",       "overseas": False, "base_price": 50*CR//100, "stats": {"avg": 26.8, "economy": 7.6, "recent_wickets": 12}},
    {"player_name": "Tim David",          "role": "Batsman",      "overseas": True,  "base_price": 50*CR//100, "stats": {"avg": 32.1, "sr": 169.4, "recent_runs": 170}},
    {"player_name": "Phil Salt",          "role": "Batsman",      "overseas": True,  "base_price": 50*CR//100, "stats": {"avg": 35.6, "sr": 151.2, "recent_runs": 200}},
]

FOOTBALL_PLAYERS = [
    {"player_name": "Erling Haaland",         "role": "Striker",    "overseas": True, "base_price": 50*CR, "stats": {"goals": 36, "assists": 8,  "rating": 9.1}},
    {"player_name": "Kylian Mbappe",          "role": "Forward",    "overseas": True, "base_price": 50*CR, "stats": {"goals": 29, "assists": 12, "rating": 8.9}},
    {"player_name": "Vinicius Jr",            "role": "Forward",    "overseas": True, "base_price": 40*CR, "stats": {"goals": 24, "assists": 10, "rating": 8.7}},
    {"player_name": "Lionel Messi",           "role": "Forward",    "overseas": True, "base_price": 30*CR, "stats": {"goals": 18, "assists": 19, "rating": 8.8}},
    {"player_name": "Kevin De Bruyne",        "role": "Midfielder", "overseas": True, "base_price": 30*CR, "stats": {"goals": 8,  "assists": 21, "rating": 8.6}},
    {"player_name": "Bukayo Saka",            "role": "Midfielder", "overseas": True, "base_price": 25*CR, "stats": {"goals": 16, "assists": 14, "rating": 8.4}},
    {"player_name": "Rodri",                  "role": "Midfielder", "overseas": True, "base_price": 25*CR, "stats": {"goals": 5,  "assists": 9,  "rating": 8.5}},
    {"player_name": "Virgil van Dijk",        "role": "Defender",   "overseas": True, "base_price": 20*CR, "stats": {"goals": 4,  "assists": 2,  "rating": 8.3}},
    {"player_name": "Alisson Becker",         "role": "Goalkeeper", "overseas": True, "base_price": 20*CR, "stats": {"goals": 0,  "assists": 0,  "rating": 8.2}},
    {"player_name": "Mohamed Salah",          "role": "Forward",    "overseas": True, "base_price": 35*CR, "stats": {"goals": 22, "assists": 13, "rating": 8.7}},
    {"player_name": "Harry Kane",             "role": "Striker",    "overseas": True, "base_price": 35*CR, "stats": {"goals": 31, "assists": 7,  "rating": 8.8}},
    {"player_name": "Trent Alexander-Arnold", "role": "Defender",   "overseas": True, "base_price": 20*CR, "stats": {"goals": 3,  "assists": 16, "rating": 8.1}},
]

BASKETBALL_PLAYERS = [
    {"player_name": "LeBron James",  "role": "Forward", "overseas": False, "base_price": 50*CR, "stats": {"ppg": 28.9, "apg": 8.3,  "rpg": 8.1}},
    {"player_name": "Stephen Curry", "role": "Guard",   "overseas": False, "base_price": 50*CR, "stats": {"ppg": 29.4, "apg": 6.1,  "rpg": 5.1}},
    {"player_name": "Giannis",       "role": "Forward", "overseas": False, "base_price": 45*CR, "stats": {"ppg": 31.1, "apg": 5.8,  "rpg": 11.8}},
    {"player_name": "Nikola Jokic",  "role": "Center",  "overseas": False, "base_price": 45*CR, "stats": {"ppg": 26.4, "apg": 9.0,  "rpg": 12.4}},
    {"player_name": "Luka Doncic",   "role": "Guard",   "overseas": False, "base_price": 45*CR, "stats": {"ppg": 33.9, "apg": 9.8,  "rpg": 9.2}},
    {"player_name": "Joel Embiid",   "role": "Center",  "overseas": False, "base_price": 40*CR, "stats": {"ppg": 34.7, "apg": 5.6,  "rpg": 11.0}},
    {"player_name": "Kevin Durant",  "role": "Forward", "overseas": False, "base_price": 35*CR, "stats": {"ppg": 29.1, "apg": 5.0,  "rpg": 6.7}},
    {"player_name": "Jayson Tatum",  "role": "Forward", "overseas": False, "base_price": 35*CR, "stats": {"ppg": 26.9, "apg": 4.9,  "rpg": 8.1}},
    {"player_name": "Anthony Davis", "role": "Center",  "overseas": False, "base_price": 30*CR, "stats": {"ppg": 24.7, "apg": 3.6,  "rpg": 12.6}},
    {"player_name": "Devin Booker",  "role": "Guard",   "overseas": False, "base_price": 30*CR, "stats": {"ppg": 27.1, "apg": 6.9,  "rpg": 4.5}},
]

UFC_FIGHTERS = [
    {"player_name": "Jon Jones",       "role": "Heavyweight",  "overseas": False, "base_price": 20*CR, "stats": {"wins": 27, "ko_wins": 10, "rating": 9.5}},
    {"player_name": "Islam Makhachev", "role": "Lightweight",  "overseas": False, "base_price": 20*CR, "stats": {"wins": 25, "ko_wins": 8,  "rating": 9.3}},
    {"player_name": "Alex Pereira",    "role": "Light-Heavy",  "overseas": False, "base_price": 18*CR, "stats": {"wins": 9,  "ko_wins": 7,  "rating": 9.1}},
    {"player_name": "Leon Edwards",    "role": "Welterweight", "overseas": False, "base_price": 15*CR, "stats": {"wins": 21, "ko_wins": 7,  "rating": 8.8}},
    {"player_name": "Sean O'Malley",   "role": "Bantamweight", "overseas": False, "base_price": 15*CR, "stats": {"wins": 17, "ko_wins": 12, "rating": 8.7}},
    {"player_name": "Israel Adesanya", "role": "Middleweight", "overseas": False, "base_price": 15*CR, "stats": {"wins": 24, "ko_wins": 15, "rating": 8.9}},
]

F1_DRIVERS = [
    {"player_name": "Max Verstappen",  "role": "Driver", "overseas": False, "base_price": 30*CR, "stats": {"wins": 19, "poles": 12, "rating": 9.8}},
    {"player_name": "Lewis Hamilton",  "role": "Driver", "overseas": False, "base_price": 25*CR, "stats": {"wins": 8,  "poles": 5,  "rating": 9.2}},
    {"player_name": "Charles Leclerc", "role": "Driver", "overseas": False, "base_price": 20*CR, "stats": {"wins": 6,  "poles": 9,  "rating": 8.9}},
    {"player_name": "Lando Norris",    "role": "Driver", "overseas": False, "base_price": 20*CR, "stats": {"wins": 4,  "poles": 3,  "rating": 8.8}},
    {"player_name": "Carlos Sainz",    "role": "Driver", "overseas": False, "base_price": 15*CR, "stats": {"wins": 5,  "poles": 4,  "rating": 8.6}},
    {"player_name": "Fernando Alonso", "role": "Driver", "overseas": False, "base_price": 15*CR, "stats": {"wins": 2,  "poles": 1,  "rating": 8.7}},
    {"player_name": "George Russell",  "role": "Driver", "overseas": False, "base_price": 15*CR, "stats": {"wins": 3,  "poles": 2,  "rating": 8.5}},
    {"player_name": "Oscar Piastri",   "role": "Driver", "overseas": False, "base_price": 12*CR, "stats": {"wins": 2,  "poles": 1,  "rating": 8.4}},
]

SPORT_POOLS    = {"cricket": CRICKET_PLAYERS, "football": FOOTBALL_PLAYERS, "basketball": BASKETBALL_PLAYERS, "ufc": UFC_FIGHTERS, "f1": F1_DRIVERS}
SPORT_SQUAD_SIZE = {"cricket": 11, "football": 11, "basketball": 5, "ufc": 3, "f1": 4}
SPORT_BUDGET   = {"cricket": 120*CR, "football": 500*CR, "basketball": 200*CR, "ufc": 100*CR, "f1": 150*CR}

def seed_players(room_code: str, sport: str):
    players = SPORT_POOLS.get(sport, [])
    to_insert = [{"room_code": room_code, "sport": sport, **p} for p in players]
    supabase.table("auction_players").insert(to_insert).execute()
    return len(to_insert)