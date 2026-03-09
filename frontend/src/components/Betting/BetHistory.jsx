import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import API from "../../services/api";

export default function BetHistory({ roomCode }) {
  const [bets, setBets] = useState([]);

  useEffect(() => {
    API.get(`/bets/${roomCode}`).then((res) => setBets(res.data.bets)).catch(console.error);
  }, [roomCode]);

  useSocket("bet_placed", (data) => {
    setBets((prev) => [...prev, { users: { name: data.userName, avatar: data.avatar }, bet_on: data.betOn, amount: data.amount, status: "pending" }]);
  });

  if (bets.length === 0) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: "#111", border: "1px solid #222" }}>
      <p className="text-gray-600 tracking-widest text-sm" style={{ fontFamily: "monospace" }}>NO BETS YET... BE THE FIRST! 🎲</p>
    </div>
  );

  return (
    <div className="rounded-2xl p-5 fade-in" style={{ background: "#111", border: "1px solid #222" }}>
      <h3 className="text-xl font-black tracking-widest mb-4" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>📋 ALL BETS</h3>
      <div className="flex flex-col gap-2">
        {bets.map((bet, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "#1a1a1a" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{bet.users?.avatar || "🐯"}</span>
              <div>
                <p className="font-bold text-sm">{bet.users?.name || "Player"}</p>
                <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>ON {bet.bet_on?.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold" style={{ color: "#00FF88" }}>₹{Number(bet.amount).toLocaleString("en-IN")}</p>
              <p className="text-xs" style={{
                fontFamily: "monospace",
                color: bet.status === "won" ? "#00FF88" : bet.status === "lost" ? "#FF3B3B" : "#FFD700"
              }}>
                {bet.status === "won" ? "✅ WON" : bet.status === "lost" ? "❌ LOST" : "⏳ PENDING"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
