import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const SPORTS = ["🏏", "⚽", "🏀", "🎾", "🥊", "🏎️", "🏈", "🏒"];

export default function HomePage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif" }}
      className="min-h-screen bg-black text-white overflow-hidden relative flex flex-col">

      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

      {/* Glowing orb */}
      <div className="absolute top-[-100px] left-1/2 transform -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />

      {/* Scrolling sports ticker */}
      <div className="relative z-10 bg-yellow-400 text-black py-2 overflow-hidden">
        <div className="flex gap-8 animate-pulse justify-center text-sm font-bold tracking-widest"
          style={{ fontFamily: "monospace" }}>
          {["🏏 IPL LIVE", "⚽ EPL LIVE", "🏀 NBA LIVE", "🥊 UFC 299", "🏎️ F1 MONACO", "🎾 WIMBLEDON"].map((s, i) => (
            <span key={i} className="mx-6">● {s}</span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">

        {/* Logo */}
        <div className="mb-2">
          <div className="text-8xl font-black tracking-tighter leading-none"
            style={{ color: "#FFD700", textShadow: "0 0 40px #FFD70088, 4px 4px 0px #000" }}>
            CHAN
          </div>
          <div className="text-8xl font-black tracking-tighter leading-none"
            style={{ color: "#fff", textShadow: "4px 4px 0px #FFD700" }}>
            BET
          </div>
        </div>

        <p className="text-gray-400 tracking-widest text-sm mb-10"
          style={{ fontFamily: "monospace" }}>
          PLAY. BET. WIN. WITH YOUR SQUAD.
        </p>

        {/* Floating sports emojis */}
        <div className="flex gap-4 mb-10 text-3xl">
          {SPORTS.map((s, i) => (
            <span key={i}
              className="transition-all duration-500"
              style={{
                transform: tick % SPORTS.length === i ? "scale(1.5) translateY(-8px)" : "scale(1)",
                filter: tick % SPORTS.length === i ? "drop-shadow(0 0 8px #FFD700)" : "none"
              }}>
              {s}
            </span>
          ))}
        </div>

        {/* Mode Cards */}
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-lg mb-8">

          {/* Live Betting Mode */}
          <button
            onClick={() => navigate("/room/create")}
            className="flex-1 group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105"
            style={{ background: "linear-gradient(135deg, #FFD700, #FF8C00)", boxShadow: "0 8px 32px #FFD70044" }}>
            <div className="text-4xl mb-3">⚡</div>
            <div className="text-2xl font-black text-black">LIVE</div>
            <div className="text-2xl font-black text-black">BETTING</div>
            <p className="text-xs text-black opacity-70 mt-2 font-normal"
              style={{ fontFamily: "monospace" }}>
              Bet on real live matches with your squad in real time
            </p>
            <div className="absolute bottom-3 right-3 text-black opacity-30 text-4xl">→</div>
          </button>

          {/* Fantasy Auction Mode */}
          <button
            onClick={() => navigate("/fantasy/create")}
            className="flex-1 group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105"
            style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "2px solid #FFD700", boxShadow: "0 8px 32px #FFD70022" }}>
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-2xl font-black text-yellow-400">FANTASY</div>
            <div className="text-2xl font-black text-yellow-400">AUCTION</div>
            <p className="text-xs text-gray-400 mt-2 font-normal"
              style={{ fontFamily: "monospace" }}>
              Auction players, build your team, simulate the match
            </p>
            <div className="absolute bottom-3 right-3 text-yellow-400 opacity-30 text-4xl">→</div>
            <div className="absolute top-3 right-3 text-xs bg-yellow-400 text-black px-2 py-1 rounded-full font-bold"
              style={{ fontFamily: "monospace" }}>
              COMING SOON
            </div>
          </button>
        </div>

        {/* Join Room */}
        <button
          onClick={() => navigate("/room/join")}
          className="text-gray-400 hover:text-yellow-400 transition tracking-widest text-sm"
          style={{ fontFamily: "monospace" }}>
          HAVE A CODE? JOIN ROOM →
        </button>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 text-center pb-4 text-gray-700 text-xs tracking-widest"
        style={{ fontFamily: "monospace" }}>
        CHANBET © 2025 — FOR ENTERTAINMENT ONLY
      </div>
    </div>
  );
}