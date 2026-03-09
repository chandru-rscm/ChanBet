import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import Login from "../Auth/Login";

const SPORTS = [
  { key: "cricket",    label: "CRICKET",    emoji: "🏏", desc: "IPL Auction • 11 players • ₹120Cr budget" },
  { key: "football",   label: "FOOTBALL",   emoji: "⚽", desc: "Transfer style • 11 players • ₹500M budget" },
  { key: "basketball", label: "BASKETBALL", emoji: "🏀", desc: "NBA Draft • 5 players • ₹200M budget" },
  { key: "ufc",        label: "UFC / MMA",  emoji: "🥊", desc: "Pick fighters • 3 picks • ₹100M budget" },
  { key: "f1",         label: "FORMULA 1",  emoji: "🏎️", desc: "Driver auction • 4 picks • ₹150M budget" },
];

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

export default function FantasyCreate() {
  const { user } = useAuth();
  const [sport, setSport] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!user) return <Login redirectTo="/fantasy/create" />;

  const handleCreate = async () => {
    if (!sport) return alert("Pick a sport first!");
    setLoading(true);
    try {
      const res = await API.post("/fantasy/create", { hostId: user.id, sport });
      navigate(`/fantasy/${res.data.room.room_code}/teams`);
    } catch (err) {
      alert("Failed to create room!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative" style={BG}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            <span className="text-5xl" style={{ color: "#FFD700" }}>CHAN</span>
            <span className="text-5xl">BET</span>
          </div>
          <h2 className="text-3xl font-black mt-1" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
            🏆 FANTASY AUCTION
          </h2>
          <p className="text-xs text-gray-600 tracking-widest mt-1" style={{ fontFamily: "monospace" }}>
            CREATE A ROOM
          </p>
        </div>

        {/* Sport Picker */}
        <p className="text-xs text-gray-600 tracking-widest mb-3" style={{ fontFamily: "monospace" }}>
          PICK YOUR SPORT
        </p>
        <div className="flex flex-col gap-3 mb-8 fade-in-1">
          {SPORTS.map((s) => (
            <button key={s.key} onClick={() => setSport(s.key)}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition"
              style={{
                background: sport === s.key ? "#1a1500" : "#111",
                border: sport === s.key ? "1px solid #FFD700" : "1px solid #222",
                transform: sport === s.key ? "scale(1.02)" : "scale(1)"
              }}>
              <span className="text-4xl">{s.emoji}</span>
              <div>
                <p className="font-black tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: sport === s.key ? "#FFD700" : "white" }}>
                  {s.label}
                </p>
                <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>{s.desc}</p>
              </div>
              {sport === s.key && (
                <span className="ml-auto text-xl">✅</span>
              )}
            </button>
          ))}
        </div>

        <button onClick={handleCreate} disabled={loading || !sport}
          className="w-full py-4 rounded-xl font-black text-xl tracking-widest transition disabled:opacity-40 fade-in-2"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black", boxShadow: "0 4px 20px #FFD70044" }}>
          {loading ? "CREATING..." : "CREATE ROOM 🏆"}
        </button>

        <button onClick={() => navigate("/")} className="w-full py-3 mt-3 rounded-xl text-sm tracking-widest"
          style={{ fontFamily: "monospace", color: "#555", border: "1px solid #222" }}>
          ← BACK
        </button>
      </div>
    </div>
  );
}