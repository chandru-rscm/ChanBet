from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.routes import auth, rooms, matches, bets
from app.sockets.events import sio

app = FastAPI(title="Sports Betting Simulator 🏆")

# Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# Routes
app.include_router(auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(rooms.router,   prefix="/rooms",   tags=["Rooms"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(bets.router,    prefix="/bets",    tags=["Bets"])

@app.get("/")
def root():
    return {"message": "API running 🏆"}
