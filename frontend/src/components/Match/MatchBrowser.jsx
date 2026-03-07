import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLiveScore } from "../../hooks/useLiveScore";
import API from "../../services/api";

const SPORTS = [
  { key: "cricket",    label: "Cricket",    emoji: "🏏" },
  { key: "football",   label: "Football",   emoji: "⚽" },
  { key: "basketball", label: "Basketball", emoji: "🏀" },
  { key: "tennis",     label: "Tennis",     emoji: "🎾" },
];

export default function MatchBrowser() {
  const { code } = useParams();
  const { user } = useAuth();
  const [selectedSport, setSelectedSport] = useState(null);
  const [picking, setPicking] = useState(false);
  const matches = useLiveScore(selectedSport);
  const navigate = useNavigate();

  const handlePickMatch = async (match) => {
    setPicking(true);
    try {
      // Save selected match to room
      await API.post("/rooms/set-match", {
        roomCode: code,
        matchId: String(match.fixture?.id || match.id),
        sport: selectedSport,
        teamA: match.teams?.home?.name || match.teams?.home,
        teamB: match.teams?.away?.name || match.teams?.away,
      });
      navigate(`/room/${code}`);
    } catch (err) {
      alert("Failed to pick match, try again!");
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400">🏟️ Pick a Match</h1>
          <p className="text-gray-400 mt-2">Choose a sport and pick a live match</p>
        </div>

        {/* Sport Selector */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {SPORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSelectedSport(s.key)}
              className={`flex flex-col items-center py-4 rounded-2xl font-bold transition ${
                selectedSport === s.key
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              <span className="text-3xl mb-1">{s.emoji}</span>
              <span className="text-sm">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Match List */}
        {!selectedSport && (
          <div className="text-center text-gray-500 mt-12">
            ☝️ Pick a sport above to see live matches
          </div>
        )}

        {selectedSport && matches.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-4xl mb-3">😴</p>
            <p>No live matches right now for {selectedSport}</p>
            <p className="text-sm mt-2">Try another sport!</p>
          </div>
        )}

        {selectedSport && matches.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-400 text-sm">{matches.length} live matches found</p>
            {matches.map((match, i) => {
              const teamA = match.teams?.home?.name || match.teams?.home || "Team A";
              const teamB = match.teams?.away?.name || match.teams?.away || "Team B";
              const scoreA = match.goals?.home ?? match.scores?.home ?? "-";
              const scoreB = match.goals?.away ?? match.scores?.away ?? "-";

              return (
                <div
                  key={i}
                  className="bg-gray-800 rounded-2xl p-5 flex items-center justify-between hover:bg-gray-700 transition"
                >
                  {/* Teams + Score */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-lg">{teamA}</span>
                      <span className="text-yellow-400 font-bold text-xl mx-4">
                        {scoreA} - {scoreB}
                      </span>
                      <span className="font-bold text-lg">{teamB}</span>
                    </div>
                    <div className="flex justify-center">
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                        🔴 LIVE
                      </span>
                    </div>
                  </div>

                  {/* Pick Button */}
                  <button
                    onClick={() => handlePickMatch(match)}
                    disabled={picking}
                    className="ml-4 bg-yellow-400 text-black px-4 py-2 rounded-xl font-bold hover:bg-yellow-300 transition disabled:opacity-50"
                  >
                    Pick
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