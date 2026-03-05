from pydantic import BaseModel
from typing import Optional

class Match(BaseModel):
    matchId: str
    sport: str
    teamA: str
    teamB: str
    status: str
    scoreA: Optional[str] = None
    scoreB: Optional[str] = None
