from pydantic import BaseModel

class User(BaseModel):
    userId: str
    name: str
    avatar: str
    coins: int = 1000
