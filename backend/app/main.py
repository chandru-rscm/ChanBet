from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.routes import auth, rooms, matches, bets, fantasy
from app.sockets.events import sio

app = FastAPI(title="ChanBet API 🏆")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_app = socketio.ASGIApp(sio, app)

app.include_router(auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(rooms.router,   prefix="/rooms",   tags=["Rooms"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(bets.router,    prefix="/bets",    tags=["Bets"])
app.include_router(fantasy.router, prefix="/fantasy", tags=["Fantasy"])

@app.get("/")
def root():
    return {"message": "ChanBet API running 🏆"}