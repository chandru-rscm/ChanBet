import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLiveScore } from "../../hooks/useLiveScore";
import API from "../../services/api";

const SPORTS = [
  { key: "cricket",    label: "CRICKET",    emoji: "🏏" },
  { key: "football",   label: "FOOTBALL",   emoji: "⚽" },
  { key: "basketball", label: "NBA",        emoji: "🏀" },
  { key: "tennis",     label: "TENNIS",     emoji: "🎾" },
];

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

export default function MatchBrowser() {
  const { code } = useParams();
  const [selectedSport, setSelectedSport] = useState(null);
  const [picking, setPicking] = useState(false);
  const matches = useLiveScore(selectedSport);
  const navigate = useNavigate();

  const handlePickMatch = async (match) => {
    setPicking(true);
    try {
      await API.post("/rooms/set-match", {
        roomCode: code,
        matchId: String(match.fixture?.id || match.id),
        sport: selectedSport,
        teamA: match.teams?.home?.name || match.teams?.home || "Team A",
        teamB: match.teams?.away?.name || match.teams?.away || "Team B",
      });
      navigate(`/room/${code}`);
    } catch (err) {
      alert("Failed to pick match!");
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative" style={BG}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <p className="text-xs text-gray-600 tracking-widest mb-2" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <h1 className="text-5xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
            PICK A MATCH
          </h1>
        </div>

        {/* Sport Selector */}
        <div className="grid grid-cols-4 gap-3 mb-8 fade-in-1">
          {SPORTS.map((s) => (
            <button key={s.key} onClick={() => setSelectedSport(s.key)}
              className="flex flex-col items-center py-4 rounded-xl font-black transition"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                background: selectedSport === s.key ? "linear-gradient(135deg, #FFD700, #FF8C00)" : "#111",
                color: selectedSport === s.key ? "black" : "white",
                border: selectedSport === s.key ? "none" : "1px solid #222",
                transform: selectedSport === s.key ? "scale(1.05)" : "scale(1)",
                letterSpacing: "1px"
              }}>
              <span className="text-2xl mb-1">{s.emoji}</span>
              <span className="text-xs">{s.label}</span>
            </button>
          ))}
        </div>

        {/* States */}
        {!selectedSport && (
          <div className="text-center py-16 fade-in-2">
            <p className="text-6xl mb-4">☝️</p>
            <p className="text-gray-600 tracking-widest text-sm" style={{ fontFamily: "monospace" }}>
              PICK A SPORT ABOVE
            </p>
          </div>
        )}

        {selectedSport && matches.length === 0 && (
          <div className="text-center py-16 fade-in-2">
            <p className="text-6xl mb-4">😴</p>
            <p className="text-gray-600 tracking-widest text-sm" style={{ fontFamily: "monospace" }}>
              NO LIVE MATCHES RIGHT NOW
            </p>
            <p className="text-gray-700 text-xs mt-2" style={{ fontFamily: "monospace" }}>TRY ANOTHER SPORT</p>
          </div>
        )}

        {selectedSport && matches.length > 0 && (
          <div className="flex flex-col gap-3 fade-in-2">
            <p className="text-xs text-gray-600 tracking-widest" style={{ fontFamily: "monospace" }}>
              {matches.length} LIVE MATCHES
            </p>
            {matches.map((match, i) => {
              const teamA = match.teams?.home?.name || match.teams?.home || "Team A";
              const teamB = match.teams?.away?.name || match.teams?.away || "Team B";
              const scoreA = match.goals?.home ?? match.scores?.home ?? "-";
              const scoreB = match.goals?.away ?? match.scores?.away ?? "-";
              return (
                <div key={i} className="flex items-center justify-between px-5 py-4 rounded-2xl transition"
                  style={{ background: "#111", border: "1px solid #222" }}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{teamA}</span>
                      <span className="font-black text-xl mx-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                        {scoreA} - {scoreB}
                      </span>
                      <span className="font-bold">{teamB}</span>
                    </div>
                    <div className="flex justify-center">
                      <span className="text-xs live-pulse" style={{ color: "#FF3B3B", fontFamily: "monospace" }}>● LIVE</span>
                    </div>
                  </div>
                  <button onClick={() => handlePickMatch(match)} disabled={picking}
                    className="ml-4 px-4 py-2 rounded-xl font-black text-sm tracking-widest transition disabled:opacity-40"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
                    PICK
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}