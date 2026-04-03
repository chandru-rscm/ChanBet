import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import Login from "../components/Auth/Login";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

export default function FantasyJoin() {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!user) return <Login redirectTo="/fantasy/join" />;

  const handleJoin = async () => {
    if (!roomCode.trim()) return alert("Enter a room code!");
    setLoading(true);
    try {
      const res = await API.post("/fantasy/join", {
        roomCode: roomCode.toUpperCase(),
        userId: user.id,
      });
      navigate(`/fantasy/${res.data.room.room_code}/teams`);
    } catch (err) {
      alert("Room not found! Check the code.");
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
          <p className="text-xs text-gray-500 tracking-widest mt-1" style={{ fontFamily: "monospace" }}>
            JOIN FANTASY ROOM
          </p>
        </div>

        <label className="text-xs text-gray-500 tracking-widest mb-3 block" style={{ fontFamily: "monospace" }}>
          ENTER ROOM CODE
        </label>
        <input type="text" placeholder="F8R71H" value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          maxLength={6}
          className="w-full bg-black border border-gray-800 focus:border-yellow-400 text-white px-4 py-4 rounded-xl outline-none transition text-center mb-8"
          style={{ fontSize: "32px", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "12px" }} />

        <button onClick={handleJoin} disabled={loading}
          className="w-full py-4 rounded-xl font-black text-xl tracking-widest mb-4 transition disabled:opacity-40"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black", boxShadow: "0 4px 20px #FFD70044" }}>
          {loading ? "JOINING..." : "JOIN ROOM 🏆"}
        </button>

        <button onClick={() => navigate("/")}
          className="w-full py-3 rounded-xl text-sm tracking-widest transition"
          style={{ fontFamily: "monospace", color: "#555", border: "1px solid #222" }}>
          ← BACK
        </button>
      </div>
    </div>
  );
}