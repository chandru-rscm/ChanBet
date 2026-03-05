from pydantic import BaseModel
from typing import List, Optional

class Room(BaseModel):
    roomCode: str
    hostId: str
    matchId: Optional[str] = None
    sport: Optional[str] = None
    status: str = "waiting"   # waiting / live / ended
    players: List[str] = []
