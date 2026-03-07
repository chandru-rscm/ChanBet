import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import API from "../../services/api";
import Login from "../Auth/Login";

export default function JoinRoom() {
  const { user } = useAuth();
  const { setRoom } = useRoom();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If not logged in, show login first
  if (!user) return <Login redirectTo="/room/join" />;

  const handleJoin = async () => {
    if (!roomCode.trim()) return alert("Enter a room code!");
    setLoading(true);
    try {
      const res = await API.post("/rooms/join", {
        roomCode: roomCode.toUpperCase(),
        userId: user.id,
      });
      setRoom(res.data.room);
      navigate(`/room/${res.data.room.room_code}`);
    } catch (err) {
      alert("Room not found! Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8">
      <h2 className="text-4xl font-bold text-yellow-400">🔑 Join a Room</h2>

      {/* User info */}
      <div className="bg-gray-800 px-6 py-4 rounded-2xl flex items-center gap-4">
        <span className="text-4xl">{user.avatar}</span>
        <div>
          <p className="font-bold text-lg">{user.name}</p>
          <p className="text-yellow-400 text-sm">🪙 {user.coins} coins</p>
        </div>
      </div>

      {/* Room Code Input */}
      <input
        type="text"
        placeholder="Enter room code..."
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="bg-gray-800 text-white px-6 py-4 rounded-xl text-2xl font-bold tracking-widest w-64 text-center outline-none border border-gray-600 focus:border-yellow-400"
      />

      <button
        onClick={handleJoin}
        disabled={loading}
        className="bg-yellow-400 text-black px-10 py-4 rounded-2xl font-bold text-xl hover:bg-yellow-300 transition disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join Room 🏃"}
      </button>

      <button
        onClick={() => navigate("/")}
        className="text-gray-500 hover:text-gray-300 transition"
      >
        ← Back
      </button>
    </div>
  );
}
