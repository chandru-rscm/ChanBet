import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import API from "../../services/api";
import Login from "../Auth/Login";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

export default function CreateRoom() {
  const { user } = useAuth();
  const { setRoom } = useRoom();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!user) return <Login redirectTo="/room/create" />;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await API.post("/rooms/create", { hostId: user.id });
      setRoom(res.data.room);
      navigate(`/room/${res.data.room.room_code}`);
    } catch (err) {
      alert("Failed to create room!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative" style={BG}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />
      <div className="relative z-10 w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            <span className="text-5xl" style={{ color: "#FFD700" }}>CHAN</span>
            <span className="text-5xl">BET</span>
          </div>
          <p className="text-xs text-gray-500 tracking-widest mt-1" style={{ fontFamily: "monospace" }}>CREATE A ROOM</p>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl mb-8" style={{ background: "#111", border: "1px solid #222" }}>
          <span className="text-4xl">{user.avatar}</span>
          <div>
            <p className="font-bold text-lg">{user.name}</p>
            <p className="text-xs tracking-widest" style={{ color: "#FFD700", fontFamily: "monospace" }}>
              ₹{(user.coins || 0).toLocaleString("en-IN")} BALANCE
            </p>
          </div>
        </div>

        <p className="text-gray-600 text-sm text-center mb-8" style={{ fontFamily: "monospace" }}>
          A 6-DIGIT CODE WILL BE GENERATED. SHARE IT WITH YOUR SQUAD!
        </p>

        <button onClick={handleCreate} disabled={loading} className="w-full py-4 rounded-xl font-black text-xl tracking-widest mb-4 transition disabled:opacity-40"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black", boxShadow: "0 4px 20px #FFD70044" }}>
          {loading ? "CREATING..." : "CREATE ROOM 🎲"}
        </button>

        <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl text-sm tracking-widest transition"
          style={{ fontFamily: "monospace", color: "#555", border: "1px solid #222" }}>
          ← BACK
        </button>
      </div>
    </div>
  );
}