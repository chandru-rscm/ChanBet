import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

@sio.event
async def connect(sid, environ):
    print(f"✅ Connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"❌ Disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room_code = data.get("roomCode")
    await sio.enter_room(sid, room_code)
    await sio.emit("room_updated", {"message": "A new player joined!"}, room=room_code)

@sio.event
async def place_bet(sid, data):
    room_code = data.get("roomCode")
    await sio.emit("bet_placed", data, room=room_code)

@sio.event
async def score_update(sid, data):
    room_code = data.get("roomCode")
    await sio.emit("score_updated", data, room=room_code)

@sio.event
async def bet_resolved(sid, data):
    room_code = data.get("roomCode")
    await sio.emit("bet_resolved", data, room=room_code)
