import httpx
from app.config import SPORTS_API_KEY

SPORT_ENDPOINTS = {
    "cricket":    "https://v1.cricket.api-sports.io/fixtures?live=all",
    "football":   "https://v3.football.api-sports.io/fixtures?live=all",
    "basketball": "https://v1.basketball.api-sports.io/games?live=all",
    "tennis":     "https://v1.tennis.api-sports.io/games?live=all",
}

async def get_live_matches(sport: str):
    url = SPORT_ENDPOINTS.get(sport.lower())
    if not url:
        return []

    headers = {"x-apisports-key": SPORTS_API_KEY}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        data = response.json()
        return data.get("response", [])
