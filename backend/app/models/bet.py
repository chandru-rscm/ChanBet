from pydantic import BaseModel
from typing import Optional

class Bet(BaseModel):
    userId: str
    roomCode: str
    matchId: str
    betOn: str         # team name the user is betting on
    amount: int
    status: str = "pending"    # pending / won / lost
    resolvedAt: Optional[str] = None
