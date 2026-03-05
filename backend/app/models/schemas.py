from pydantic import BaseModel
from typing import Optional

class UserLogin(BaseModel):
    userId: str
    name: str
    avatar: str

class CreateRoom(BaseModel):
    hostId: str

class JoinRoom(BaseModel):
    roomCode: str
    userId: str

class PlaceBet(BaseModel):
    userId: str
    roomCode: str
    matchId: str
    betOn: str
    amount: int

class ResolveBet(BaseModel):
    matchId: str
    winner: str
