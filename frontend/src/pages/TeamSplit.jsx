import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import API from "../services/api";
import socket from "../services/socket";
import Login from "../components/Auth/Login";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

export default function TeamSplit() {
  const { code } = useParams();
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myTeam, setMyTeam] = useState(null); // current user's chosen team
  const [assignments, setAssignments] = useState({}); // { userId: "A" | "B" }
  const navigate = useNavigate();

  const fetchPlayers = async () => {
    try {
      const [roomRes, playersRes] = await Promise.all([
        API.get(`/fantasy/${code}`),
        API.get(`/fantasy/${code}/players`)
      ]);
      setRoom(roomRes.data.room);
      setPlayers(playersRes.data.players);

      // Restore existing assignments from DB
      const existing = {};
      playersRes.data.players.forEach(p => {
        if (p.team) existing[p.user_id] = p.team;
      });
      setAssignments(existing);

      // Restore my team
      const me = playersRes.data.players.find(p => p.user_id === user?.id);
      if (me?.team) setMyTeam(me.team);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPlayers();
    socket.emit("join_fantasy_room", { roomCode: code });
  }, [code]);

  useSocket("fantasy_room_updated", fetchPlayers);
  useSocket("teams_set", () => navigate(`/fantasy/${code}/auction`));

  if (!user) return <Login redirectTo={`/fantasy/${code}/teams`} />;

  const isHost = room?.host_id === user?.id;
  const teamACount = Object.values(assignments).filter(t => t === "A").length;
  const teamBCount = Object.values(assignments).filter(t => t === "B").length;
  const maxPerTeam = Math.ceil(players.length / 2);

  const handlePickTeam = async (team) => {
    // Check if team is full
    const count = team === "A" ? teamACount : teamBCount;
    if (count >= maxPerTeam && assignments[user.id] !== team) {
      return alert(`Team ${team} is full!`);
    }

    // Update locally
    setMyTeam(team);
    setAssignments(prev => ({ ...prev, [user.id]: team }));

    // Save to backend immediately
    try {
      await API.post(`/fantasy/${code}/pick-team`, {
        userId: user.id,
        team,
      });
      // Notify others
      socket.emit("join_fantasy_room", { roomCode: code });
    } catch (err) {
      console.error("Failed to save team pick");
    }
  };

  const handleConfirm = async () => {
    const unassigned = players.filter(p => !assignments[p.user_id]);
    if (unassigned.length > 0) {
      return alert(`${unassigned.length} player(s) haven't picked a team yet!`);
    }
    setLoading(true);
    try {
      const teamA = Object.entries(assignments).filter(([, t]) => t === "A").map(([id]) => id);
      const teamB = Object.entries(assignments).filter(([, t]) => t === "B").map(([id]) => id);
      await API.post(`/fantasy/${code}/teams`, { teamA, teamB });
      navigate(`/fantasy/${code}/auction`);
    } catch (err) {
      alert("Failed to start auction!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative" style={BG}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm fade-in">
        <div className="text-center mb-6">
          <p className="text-xs text-gray-600 tracking-widest mb-1" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <h1 className="text-4xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>PICK YOUR TEAM</h1>
          <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: "monospace" }}>
            CHOOSE YOUR SIDE — MAX {maxPerTeam} PER TEAM
          </p>
        </div>

        {/* Team Pick Buttons (for current user) */}
        {!myTeam ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => handlePickTeam("A")}
              disabled={teamACount >= maxPerTeam}
              className="py-6 rounded-2xl font-black text-2xl transition disabled:opacity-30"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                background: "linear-gradient(135deg, #FF3B3B, #CC0000)",
                color: "white",
                boxShadow: "0 4px 20px #FF3B3B44"
              }}>
              TEAM A
              <p className="text-sm mt-1">{teamACount}/{maxPerTeam}</p>
            </button>
            <button onClick={() => handlePickTeam("B")}
              disabled={teamBCount >= maxPerTeam}
              className="py-6 rounded-2xl font-black text-2xl transition disabled:opacity-30"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                background: "linear-gradient(135deg, #4488FF, #0044CC)",
                color: "white",
                boxShadow: "0 4px 20px #4488FF44"
              }}>
              TEAM B
              <p className="text-sm mt-1">{teamBCount}/{maxPerTeam}</p>
            </button>
          </div>
        ) : (
          <div className="text-center py-4 rounded-2xl mb-6"
            style={{ background: myTeam === "A" ? "#1a0a0a" : "#0a0a1a", border: `2px solid ${myTeam === "A" ? "#FF3B3B" : "#4488FF"}` }}>
            <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: "monospace" }}>YOU'RE ON</p>
            <p className="text-3xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: myTeam === "A" ? "#FF3B3B" : "#4488FF" }}>
              TEAM {myTeam}
            </p>
            <button onClick={() => handlePickTeam(myTeam === "A" ? "B" : "A")}
              className="text-xs mt-2 underline"
              style={{ fontFamily: "monospace", color: "#555" }}>
              switch team
            </button>
          </div>
        )}

        {/* Team Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: "#1a0a0a", border: "1px solid #FF3B3B44" }}>
            <p className="text-xs tracking-widest mb-2" style={{ fontFamily: "monospace", color: "#FF3B3B" }}>TEAM A ({teamACount}/{maxPerTeam})</p>
            {players.filter(p => assignments[p.user_id] === "A").map((p, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="text-lg">{p.users?.avatar || "🐯"}</span>
                <span className="text-sm font-bold">{p.users?.name}</span>
                {p.user_id === room?.host_id && <span className="text-xs" style={{ color: "#FFD700" }}>👑</span>}
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl" style={{ background: "#0a0a1a", border: "1px solid #4488FF44" }}>
            <p className="text-xs tracking-widest mb-2" style={{ fontFamily: "monospace", color: "#4488FF" }}>TEAM B ({teamBCount}/{maxPerTeam})</p>
            {players.filter(p => assignments[p.user_id] === "B").map((p, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="text-lg">{p.users?.avatar || "🐯"}</span>
                <span className="text-sm font-bold">{p.users?.name}</span>
                {p.user_id === room?.host_id && <span className="text-xs" style={{ color: "#FFD700" }}>👑</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Unassigned */}
        {players.filter(p => !assignments[p.user_id]).length > 0 && (
          <div className="rounded-xl p-3 mb-4" style={{ background: "#111", border: "1px solid #333" }}>
            <p className="text-xs text-gray-600 tracking-widest mb-2" style={{ fontFamily: "monospace" }}>UNDECIDED</p>
            {players.filter(p => !assignments[p.user_id]).map((p, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="text-lg">{p.users?.avatar || "🐯"}</span>
                <span className="text-sm text-gray-400">{p.users?.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Host confirm button */}
        {isHost && (
          <button onClick={handleConfirm} disabled={loading}
            className="w-full py-4 rounded-xl font-black text-xl tracking-widest disabled:opacity-40"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black", boxShadow: "0 4px 20px #FFD70044" }}>
            {loading ? "STARTING..." : "START AUCTION 🔨"}
          </button>
        )}

        {!isHost && (
          <p className="text-center text-xs live-pulse mt-2" style={{ fontFamily: "monospace", color: "#FFD700" }}>
            ● WAITING FOR HOST TO START AUCTION...
          </p>
        )}
      </div>
    </div>
  );
}