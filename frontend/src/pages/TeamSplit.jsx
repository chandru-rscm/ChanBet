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

const IPL_TEAMS = [
  { key: "CSK", label: "Chennai Super Kings", abbrev: "CSK", color: "#FFFF00", textColor: "#000", emoji: "🦁", secondaryColor: "#F9A825" },
  { key: "RCB", label: "Royal Challengers Bengaluru", abbrev: "RCB", color: "#CC0000", textColor: "#FFF", emoji: "👑", secondaryColor: "#FFD700" },
  { key: "MI", label: "Mumbai Indians", abbrev: "MI", color: "#004B87", textColor: "#FFF", emoji: "🧿", secondaryColor: "#00CFFF" },
  { key: "KKR", label: "Kolkata Knight Riders", abbrev: "KKR", color: "#3A225D", textColor: "#FFF", emoji: "⚔️", secondaryColor: "#FFD700" },
  { key: "RR", label: "Rajasthan Royals", abbrev: "RR", color: "#EA1B85", textColor: "#FFF", emoji: "🏰", secondaryColor: "#004B87" },
  { key: "SRH", label: "Sunrisers Hyderabad", abbrev: "SRH", color: "#FF822E", textColor: "#FFF", emoji: "🦅", secondaryColor: "#000" },
  { key: "LSG", label: "Lucknow Super Giants", abbrev: "LSG", color: "#0057B8", textColor: "#FFF", emoji: "🏹", secondaryColor: "#FF4500" },
  { key: "GT", label: "Gujarat Titans", abbrev: "GT", color: "#0B2265", textColor: "#FFF", emoji: "⚡", secondaryColor: "#FFD700" },
  { key: "DC", label: "Delhi Capitals", abbrev: "DC", color: "#0078FF", textColor: "#FFF", emoji: "🐯", secondaryColor: "#CC0000" },
  { key: "PBKS", label: "Punjab Kings", abbrev: "PBKS", color: "#D71A21", textColor: "#FFF", emoji: "🦁", secondaryColor: "#DDD" }
];

export default function TeamSplit() {
  const { code } = useParams();
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Dual Franchise states
  const [myTeam, setMyTeam] = useState(null); // "A" or "B"
  const [assignments, setAssignments] = useState({}); // { userId: "A" | "B" }
  const [teamAName, setTeamAName] = useState("CSK");
  const [teamBName, setTeamBName] = useState("RCB");

  const navigate = useNavigate();

  const fetchPlayers = async () => {
    try {
      const [roomRes, playersRes] = await Promise.all([
        API.get(`/fantasy/${code}`),
        API.get(`/fantasy/${code}/players`)
      ]);
      setRoom(roomRes.data.room);
      setPlayers(playersRes.data.players);

      if (roomRes.data.room.game_mode === "dual_franchise") {
        const existing = {};
        playersRes.data.players.forEach(p => {
          if (p.team) existing[p.user_id] = p.team;
        });
        setAssignments(existing);
        const me = playersRes.data.players.find(p => p.user_id === user?.id);
        if (me?.team) setMyTeam(me.team);
        if (roomRes.data.room.team_a_name) setTeamAName(roomRes.data.room.team_a_name);
        if (roomRes.data.room.team_b_name) setTeamBName(roomRes.data.room.team_b_name);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPlayers();
    socket.emit("join_fantasy_room", { roomCode: code });
  }, [code]);

  useSocket("fantasy_room_updated", fetchPlayers);
  useSocket("franchise_claimed", (data) => {
    fetchPlayers();
  });
  useSocket("teams_set", () => navigate(`/fantasy/${code}/auction`));

  if (!user) return <Login redirectTo={`/fantasy/${code}/teams`} />;

  const isHost = room?.host_id === user?.id;
  const isLeagueMode = room?.game_mode === "multiplayer_league";

  // Dual Franchise counters
  const teamACount = Object.values(assignments).filter(t => t === "A").length;
  const teamBCount = Object.values(assignments).filter(t => t === "B").length;
  const maxPerTeam = Math.ceil(players.length / 2);

  // Dual Franchise Picker
  const handlePickTeam = async (team) => {
    const count = team === "A" ? teamACount : teamBCount;
    if (count >= maxPerTeam && assignments[user.id] !== team) {
      return alert(`Team ${team} is full!`);
    }

    setMyTeam(team);
    setAssignments(prev => ({ ...prev, [user.id]: team }));

    try {
      await API.post(`/fantasy/${code}/pick-team`, {
        userId: user.id,
        team,
      });
      socket.emit("join_fantasy_room", { roomCode: code });
    } catch (err) {
      console.error("Failed to save team pick");
    }
  };

  // Dual Franchise Host Confirm
  const handleConfirmDual = async () => {
    const unassigned = players.filter(p => !assignments[p.user_id]);
    if (unassigned.length > 0) {
      return alert(`${unassigned.length} player(s) haven't picked a team yet!`);
    }
    setLoading(true);
    try {
      const teamA = Object.entries(assignments).filter(([, t]) => t === "A").map(([id]) => id);
      const teamB = Object.entries(assignments).filter(([, t]) => t === "B").map(([id]) => id);
      await API.post(`/fantasy/${code}/teams`, { 
        teamA, 
        teamB,
        teamAName,
        teamBName
      });
      navigate(`/fantasy/${code}/auction`);
    } catch (err) {
      alert("Failed to start auction!");
    } finally {
      setLoading(false);
    }
  };

  // League Mode franchise picking
  const handlePickFranchise = async (franchiseKey) => {
    // Check if someone else already took it
    const taken = players.find(p => p.selected_team === franchiseKey && p.user_id !== user.id);
    if (taken) {
      return alert("This franchise has already been claimed by another player!");
    }

    try {
      await API.post(`/fantasy/${code}/pick-franchise`, {
        userId: user.id,
        franchise: franchiseKey
      });
      socket.emit("join_fantasy_room", { roomCode: code });
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to claim franchise!");
    }
  };

  // League Mode Host Confirm
  const handleConfirmLeague = async () => {
    const unassigned = players.filter(p => !p.selected_team);
    if (unassigned.length > 0) {
      return alert(`${unassigned.length} player(s) haven't claimed an IPL franchise yet!`);
    }
    setLoading(true);
    try {
      await API.post(`/fantasy/${code}/start-league-auction`);
      navigate(`/fantasy/${code}/auction`);
    } catch (err) {
      alert("Failed to start league auction!");
    } finally {
      setLoading(false);
    }
  };

  const myClaimedFranchise = players.find(p => p.user_id === user.id)?.selected_team;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative" style={BG}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-4xl fade-in flex flex-col gap-6">
        <div className="text-center">
          <p className="text-xs text-gray-600 tracking-widest mb-1" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <h1 className="text-5xl font-black mb-1" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700", letterSpacing: "1px" }}>
            {isLeagueMode ? "CLAIM YOUR FRANCHISE" : "SPLIT THE LOBBY"}
          </h1>
          <p className="text-sm text-gray-500 font-medium max-w-md mx-auto" style={{ fontFamily: "monospace" }}>
            {isLeagueMode 
              ? "Every player gets a unique IPL team for the live auction & round-robin season."
              : `Choose Team A or Team B. Maximum ${maxPerTeam} players per side.`}
          </p>
        </div>

        {isLeagueMode ? (
          /* =============================================
             MULTIPLAYER LEAGUE FRANCHISE SELECTION
             ============================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-4">
            {IPL_TEAMS.map((team) => {
              const claimedBy = players.find(p => p.selected_team === team.key);
              const isMe = claimedBy?.user_id === user.id;

              return (
                <button
                  key={team.key}
                  onClick={() => handlePickFranchise(team.key)}
                  disabled={!!claimedBy && !isMe}
                  className="relative p-5 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 overflow-hidden hover:scale-105"
                  style={{
                    background: isMe ? `${team.color}15` : "#111",
                    borderColor: isMe ? team.color : (claimedBy ? "#222" : "#333"),
                    boxShadow: isMe ? `0 0 25px ${team.color}33` : "none",
                    opacity: claimedBy && !isMe ? 0.35 : 1
                  }}
                >
                  {/* Team Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: team.color }} />

                  <span className="text-5xl my-2 filter drop-shadow-md">{team.emoji}</span>

                  <h3 className="font-extrabold text-lg tracking-wider" style={{ color: isMe ? team.color : "white" }}>
                    {team.abbrev}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{team.label}</p>

                  {claimedBy ? (
                    <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/5">
                      <span className="text-sm">{claimedBy.users?.avatar || "🐯"}</span>
                      <span className="text-xs font-semibold text-gray-300 truncate max-w-[80px]">{isMe ? "YOU" : claimedBy.users?.name}</span>
                    </div>
                  ) : (
                    <span className="mt-2 text-xs font-bold px-3 py-1 rounded-full bg-white/5 text-[#FFD700] hover:bg-[#FFD700]/10 border border-[#FFD700]/20">
                      CLAIM
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* =============================================
             DUAL FRANCHISE SPLIT
             ============================================= */
          <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
            {/* Host customization card */}
            {isHost && (
              <div className="bg-[#111] border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl">
                <div className="flex-1 w-full">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Team A Franchise</label>
                  <select
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#FFD700]"
                  >
                    {IPL_TEAMS.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label} ({t.key})</option>)}
                  </select>
                </div>
                <div className="text-2xl font-black text-gray-600 self-end mb-2 hidden md:block">VS</div>
                <div className="flex-1 w-full">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Team B Franchise</label>
                  <select
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#FFD700]"
                  >
                    {IPL_TEAMS.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label} ({t.key})</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Team Pick Buttons (for current user) */}
            {!myTeam ? (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handlePickTeam("A")}
                  disabled={teamACount >= maxPerTeam}
                  className="py-6 rounded-2xl font-black text-3xl transition disabled:opacity-30 relative overflow-hidden group hover:scale-102"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    background: "linear-gradient(135deg, #FF3B3B, #CC0000)",
                    color: "white",
                    boxShadow: "0 4px 25px #FF3B3B55"
                  }}
                >
                  <span className="block">{IPL_TEAMS.find(t => t.key === teamAName)?.emoji || "🥊"} {teamAName}</span>
                  <p className="text-xs font-semibold tracking-widest mt-1 uppercase text-white/80">{teamACount}/{maxPerTeam} CHOSEN</p>
                </button>
                <button onClick={() => handlePickTeam("B")}
                  disabled={teamBCount >= maxPerTeam}
                  className="py-6 rounded-2xl font-black text-3xl transition disabled:opacity-30 relative overflow-hidden group hover:scale-102"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    background: "linear-gradient(135deg, #4488FF, #0044CC)",
                    color: "white",
                    boxShadow: "0 4px 25px #4488FF55"
                  }}
                >
                  <span className="block">{IPL_TEAMS.find(t => t.key === teamBName)?.emoji || "🥊"} {teamBName}</span>
                  <p className="text-xs font-semibold tracking-widest mt-1 uppercase text-white/80">{teamBCount}/{maxPerTeam} CHOSEN</p>
                </button>
              </div>
            ) : (
              <div className="text-center py-5 rounded-2xl border-2"
                style={{
                  background: myTeam === "A" ? "#1a0a0a" : "#0a0a1a",
                  borderColor: myTeam === "A" ? "#FF3B3B" : "#4488FF",
                  boxShadow: `0 0 30px ${myTeam === "A" ? "#FF3B3B22" : "#4488FF22"}`
                }}
              >
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">YOUR SELECTED FRANCHISE</p>
                <p className="text-4xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: myTeam === "A" ? "#FF3B3B" : "#4488FF" }}>
                  {myTeam === "A" ? `${IPL_TEAMS.find(t => t.key === teamAName)?.emoji || ""} ${teamAName}` : `${IPL_TEAMS.find(t => t.key === teamBName)?.emoji || ""} ${teamBName}`}
                </p>
                <button onClick={() => handlePickTeam(myTeam === "A" ? "B" : "A")}
                  className="text-xs mt-3 uppercase tracking-wider font-bold text-gray-400 hover:text-white transition underline"
                  style={{ fontFamily: "monospace" }}>
                  Switch Side
                </button>
              </div>
            )}

            {/* Team Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl" style={{ background: "#1a0a0a", border: "1px solid #FF3B3B22" }}>
                <p className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ fontFamily: "monospace", color: "#FF3B3B" }}>
                  {IPL_TEAMS.find(t => t.key === teamAName)?.emoji} {teamAName} ({teamACount}/{maxPerTeam})
                </p>
                {players.filter(p => assignments[p.user_id] === "A").map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-lg">{p.users?.avatar || "🐯"}</span>
                    <span className="text-sm font-extrabold text-gray-200">{p.users?.name}</span>
                    {p.user_id === room?.host_id && <span className="text-xs ml-auto" style={{ color: "#FFD700" }}>👑 HOST</span>}
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "#0a0a1a", border: "1px solid #4488FF22" }}>
                <p className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ fontFamily: "monospace", color: "#4488FF" }}>
                  {IPL_TEAMS.find(t => t.key === teamBName)?.emoji} {teamBName} ({teamBCount}/{maxPerTeam})
                </p>
                {players.filter(p => assignments[p.user_id] === "B").map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-lg">{p.users?.avatar || "🐯"}</span>
                    <span className="text-sm font-extrabold text-gray-200">{p.users?.name}</span>
                    {p.user_id === room?.host_id && <span className="text-xs ml-auto" style={{ color: "#FFD700" }}>👑 HOST</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Unassigned List for Dual mode or general lobby info */}
        {!isLeagueMode && players.filter(p => !assignments[p.user_id]).length > 0 && (
          <div className="rounded-2xl p-4 max-w-2xl mx-auto w-full" style={{ background: "#111", border: "1px solid #222" }}>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2" style={{ fontFamily: "monospace" }}>LOBBY PLAYER STATUS (UNDECIDED)</p>
            <div className="flex flex-wrap gap-2">
              {players.filter(p => !assignments[p.user_id]).map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-lg">{p.users?.avatar || "🐯"}</span>
                  <span className="text-sm text-gray-400 font-bold">{p.users?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Player List in League Mode for Info */}
        {isLeagueMode && (
          <div className="rounded-2xl p-4 bg-[#111] border border-white/5 max-w-xl mx-auto w-full">
            <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2" style={{ fontFamily: "monospace" }}>
              LOBBY ACTIVE PLAYERS ({players.length})
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black border border-white/5">
                  <span className="text-base">{p.users?.avatar || "🐯"}</span>
                  <div className="truncate">
                    <p className="text-xs font-bold text-gray-200 leading-tight">{p.users?.name}</p>
                    <p className="text-[9px] font-bold text-[#FFD700] uppercase tracking-wider">
                      {p.selected_team ? `📢 ${p.selected_team}` : "⏳ DECIDING..."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Action Button */}
        <div className="max-w-md mx-auto w-full">
          {isHost ? (
            <button
              onClick={isLeagueMode ? handleConfirmLeague : handleConfirmDual}
              disabled={loading}
              className="w-full py-4 rounded-xl font-black text-2xl tracking-widest transition-all uppercase duration-300 transform hover:scale-102"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                color: "black",
                boxShadow: "0 6px 25px #FFD70044"
              }}
            >
              {loading ? "STARTING..." : "START LIVE AUCTION 🔨"}
            </button>
          ) : (
            <div className="text-center py-3 px-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs font-bold tracking-widest uppercase text-[#FFD700] live-pulse" style={{ fontFamily: "monospace" }}>
                ● Waiting for host to start the auction...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}