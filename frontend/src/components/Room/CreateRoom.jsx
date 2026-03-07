import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import API from "../../services/api";
import Login from "../Auth/Login";

export default function CreateRoom() {
  const { user } = useAuth();
  const { setRoom } = useRoom();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If not logged in, show login first
  if (!user) return <Login redirectTo="/room/create" />;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await API.post("/rooms/create", { hostId: user.id });
      setRoom(res.data.room);
      navigate(`/room/${res.data.room.room_code}`);
    } catch (err) {
      alert("Failed to create room, try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8">
      <h2 className="text-4xl font-bold text-yellow-400">🚀 Create a Room</h2>

      {/* User info */}
      <div className="bg-gray-800 px-6 py-4 rounded-2xl flex items-center gap-4">
        <span className="text-4xl">{user.avatar}</span>
        <div>
          <p className="font-bold text-lg">{user.name}</p>
          <p className="text-yellow-400 text-sm">🪙 {user.coins} coins</p>
        </div>
      </div>

      <p className="text-gray-400 text-center max-w-sm">
        A 6-digit room code will be generated. Share it with your friends to join!
      </p>

      <button
        onClick={handleCreate}
        disabled={loading}
        className="bg-yellow-400 text-black px-10 py-4 rounded-2xl font-bold text-xl hover:bg-yellow-300 transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Room 🎲"}
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
