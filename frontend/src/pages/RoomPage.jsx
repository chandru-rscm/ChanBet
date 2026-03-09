import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { useSocket } from "../hooks/useSocket";
import RoomLobby from "../components/Room/RoomLobby";
import BetPanel from "../components/Betting/BetPanel";
import BetHistory from "../components/Betting/BetHistory";
import Leaderboard from "../components/Leaderboard/Leaderboard";
import Login from "../components/Auth/Login";
import API from "../services/api";
import socket from "../services/socket";

export default function RoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { room, setRoom } = useRoom();
  const [liveScore, setLiveScore] = useState(null);
  const [tab, setTab] = useState("bet");
  const navigate = useNavigate();

  if (!user) return <Login redirectTo={`/room/${code}`} />;

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await API.get(`/rooms/${code}`);
        setRoom(res.data.room);
      } catch (err) {
        console.error("Error fetching room:", err);
      }
    };
    fetchRoom();
    socket.emit("join_room", { roomCode: code });
  }, [code]);

  useEffect(() => {
    if (!room?.match_id || !room?.sport) return;
    const fetchScore = async () => {
      try {
        const res = await API.get(`/matches/score?sport=${room.sport}&matchId=${room.match_id}`);
        setLiveScore(res.data.score);
      } catch (err) {
        console.error("Score fetch error:", err);
      }
    };
    fetchScore();
    const interval = setInterval(fetchScore, 30000);
    return () => clearInterval(interval);
  }, [room?.match_id, room?.sport]);

  useSocket("score_updated", (data) => setLiveScore(data));

  if (!room || room.status === "waiting") {
    return <RoomLobby />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div>
          <p className="text-xs text-gray-400">Room</p>
          <p className="font-bold tracking-widest text-yellow-400">{code}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">{room.sport?.toUpperCase()}</p>
          <p className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">🔴 LIVE</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Balance</p>
          <p className="font-bold text-green-400">₹{(user?.coins || 0).toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="bg-gray-800 mx-4 mt-4 rounded-2xl p-5 text-center border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-bold text-lg">{room.team_a}</p>
          </div>
          <div className="px-4">
            {liveScore ? (
              <p className="text-2xl font-bold text-yellow-400">
                {liveScore.scoreA} - {liveScore.scoreB}
              </p>
            ) : (
              <p className="text-xl font-bold text-gray-500">VS</p>
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{room.team_b}</p>
          </div>
        </div>
        {liveScore?.status && (
          <p className="text-xs text-gray-400 mt-2">{liveScore.status}</p>
        )}
      </div>

      <div className="flex mx-4 mt-4 bg-gray-800 rounded-xl p-1">
        {[
          { key: "bet", label: "🎲 Bet" },
          { key: "history", label: "📋 Bets" },
          { key: "leaderboard", label: "🏆 Ranks" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
              tab === t.key ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "bet" && (
          <BetPanel match={room} roomCode={code} onBetPlaced={() => setTab("history")} />
        )}
        {tab === "history" && <BetHistory roomCode={code} />}
        {tab === "leaderboard" && <Leaderboard roomCode={code} />}
      </div>
    </div>
  );
}