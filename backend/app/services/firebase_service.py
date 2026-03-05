import firebase_admin
from firebase_admin import credentials, firestore
from app.config import FIREBASE_CREDENTIALS

# Initialize Firebase only once
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS)
    firebase_admin.initialize_app(cred)

db = firestore.client()

async def create_or_get_user(user):
    ref = db.collection("users").document(user.userId)
    if not ref.get().exists:
        ref.set(user.dict())
    return ref.get().to_dict()

async def create_room(room):
    ref = db.collection("rooms").document(room.roomCode)
    ref.set(room.dict())
    return room.dict()

async def join_room(roomCode, userId):
    ref = db.collection("rooms").document(roomCode)
    room = ref.get().to_dict()
    if userId not in room["players"]:
        room["players"].append(userId)
        ref.update({"players": room["players"]})
    return room

async def place_bet(bet):
    ref = db.collection("bets").document()
    ref.set(bet.dict())
    return bet.dict()

async def get_bets_by_room(roomCode):
    bets = db.collection("bets").where("roomCode", "==", roomCode).stream()
    return [b.to_dict() for b in bets]
