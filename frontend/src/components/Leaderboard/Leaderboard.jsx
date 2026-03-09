import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import API from "../../services/api";

export default function Leaderboard({ roomCode }) {
  const [players, setPlayers] = useState([]);

  const fetchPlayers = async () => {
    try {
      const res = await API.get(`/rooms/${roomCode}/players`);
      setPlayers(res.data.players.sort((a, b) => (b.users?.coins || 0) - (a.users?.coins || 0)));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchPlayers(); }, [roomCode]);
  useSocket("bet_resolved", fetchPlayers);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="rounded-2xl p-5 fade-in" style={{ background: "#111", border: "1px solid #222" }}>
      <h3 className="text-xl font-black tracking-widest mb-4" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>🏆 LEADERBOARD</h3>
      <div className="flex flex-col gap-2">
        {players.map((p, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl transition"
            style={{ background: i === 0 ? "#1a1500" : "#1a1a1a", border: i === 0 ? "1px solid #FFD70044" : "none" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{medals[i] || `#${i + 1}`}</span>
              <span className="text-2xl">{p.users?.avatar || "🐯"}</span>
              <p className="font-bold">{p.users?.name || "Player"}</p>
            </div>
            <p className="font-bold" style={{ color: i === 0 ? "#FFD700" : "#00FF88" }}>
              ₹{(p.users?.coins || 0).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}