from fastapi import APIRouter
from app.models.schemas import UserLogin
from app.services.supabase_service import create_or_get_user

router = APIRouter()

@router.post("/login")
def login(body: UserLogin):
    user = create_or_get_user(body.userId, body.name, body.avatar)
    return {"status": "ok", "user": user}
