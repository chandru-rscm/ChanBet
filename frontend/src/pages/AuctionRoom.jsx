import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import API from "../services/api";
import socket from "../services/socket";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

const CR = 10_000_000;
const fmt = (n) => {
  if (!n) return "₹0";
  if (n >= CR) return `₹${(n / CR).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
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

export default function AuctionRoom() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  
  const [activeTeams, setActiveTeams] = useState([]);
  const [squads, setSquads] = useState({}); // { [teamKey]: Array }
  const [spents, setSpents] = useState({}); // { [teamKey]: Number }

  const [budget, setBudget] = useState(0);
  const [squadSize, setSquadSize] = useState(11);
  const [timer, setTimer] = useState(0);
  const [timerDuration, setTimerDuration] = useState(15);
  const [myCurrentBid, setMyCurrentBid] = useState(0);
  const [currentHighest, setCurrentHighest] = useState(null);
  const [notification, setNotification] = useState(null);
  const [auctionDone, setAuctionDone] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  const timerRef = useRef(null);
  const sellTimeoutRef = useRef(null);
  const activeTeamsRef = useRef([]);
  const roomRef = useRef(null);

  const getTeamDetails = (teamKey) => {
    if (!teamKey) return { key: "?", label: "Unknown Team", emoji: "⏳", color: "#888888" };
    let key = teamKey;
    const currentRoom = roomRef.current || room;
    if (currentRoom && currentRoom.game_mode === "dual_franchise") {
      if (teamKey === "A") key = currentRoom.team_a_name || "CSK";
      if (teamKey === "B") key = currentRoom.team_b_name || "RCB";
    }
    return IPL_TEAMS.find(t => t.key === key) || { key: teamKey, label: `Team ${teamKey}`, emoji: "🏏", color: "#FFD700", secondaryColor: "#FF8C00" };
  };

  const refreshSquads = async (teamsList) => {
    if (!teamsList || teamsList.length === 0) return;
    try {
      const results = await Promise.all(
        teamsList.map(async (t) => {
          const res = await API.get(`/fantasy/${code}/squad/${t}`);
          return { team: t, squad: res.data.squad, spent: res.data.spent };
        })
      );
      const newSquads = {};
      const newSpents = {};
      results.forEach(r => {
        newSquads[r.team] = r.squad;
        newSpents[r.team] = r.spent;
      });
      setSquads(newSquads);
      setSpents(newSpents);
    } catch (err) {
      console.error("Failed to refresh squads:", err);
    }
  };

  const fetchAll = async () => {
    try {
      const [roomRes, auctionRes, myTeamRes] = await Promise.all([
        API.get(`/fantasy/${code}`),
        API.get(`/fantasy/${code}/auction/players`),
        API.get(`/fantasy/${code}/players`),
      ]);
      setRoom(roomRes.data.room);
      roomRef.current = roomRes.data.room;

      setPlayers(auctionRes.data.players);
      setBudget(auctionRes.data.budget);
      setSquadSize(auctionRes.data.squad_size);
      
      const me = myTeamRes.data.players.find(p => p.user_id === user?.id);
      setMyTeam(me?.team);

      // Extract unique active teams
      const teams = Array.from(new Set(myTeamRes.data.players.map(p => p.team))).filter(Boolean);
      setActiveTeams(teams);
      activeTeamsRef.current = teams;
      
      refreshSquads(teams);
    } catch (err) {
      console.error("Error fetching room details:", err);
    }
  };

  useEffect(() => {
    fetchAll();
    socket.emit("join_fantasy_room", { roomCode: code });
  }, [code]);

  // Server-driven timer
  const startTimer = (seconds) => {
    setTimer(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const showNotif = (msg, color = "#FFD700") => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── Socket listeners ──────────────────────────────
  useSocket("auction_next", (data) => {
    setActivePlayer(data.player);
    setMyCurrentBid(0);
    setCurrentHighest(null);
    startTimer(data.timerDuration || timerDuration);
    clearTimeout(sellTimeoutRef.current);
    sellTimeoutRef.current = setTimeout(() => {
      if (data.player) API.post(`/fantasy/${code}/auction/sell`, { playerId: data.player.id });
    }, (data.timerDuration || timerDuration) * 1000 + 800);
  });

  useSocket("bid_placed", (data) => {
    setCurrentHighest({ team: data.team, amount: data.amount, userName: data.userName });
    if (data.team === myTeam) setMyCurrentBid(data.amount);
    startTimer(data.timerDuration || timerDuration);
    clearTimeout(sellTimeoutRef.current);
    sellTimeoutRef.current = setTimeout(() => {
      if (activePlayer) API.post(`/fantasy/${code}/auction/sell`, { playerId: data.playerId });
    }, (data.timerDuration || timerDuration) * 1000 + 800);
    
    const details = getTeamDetails(data.team);
    showNotif(`${details.emoji} ${details.key} bid ${fmt(data.amount)}!`, details.color);
  });

  useSocket("player_sold", (data) => {
    clearTimeout(sellTimeoutRef.current);
    clearInterval(timerRef.current);
    setTimer(0); setActivePlayer(null); setMyCurrentBid(0); setCurrentHighest(null);
    
    const details = getTeamDetails(data.team);
    showNotif(`${data.playerName} → ${details.emoji} ${details.key} ${fmt(data.amount)} ${data.stealLabel}`, details.color);
    
    API.get(`/fantasy/${code}/auction/players`).then(res => setPlayers(res.data.players));
    refreshSquads(activeTeamsRef.current);
  });

  useSocket("player_unsold", (data) => {
    clearTimeout(sellTimeoutRef.current);
    clearInterval(timerRef.current);
    setTimer(0); setActivePlayer(null);
    showNotif(`${data.playerName} UNSOLD 😢`, "#555");
    API.get(`/fantasy/${code}/auction/players`).then(res => setPlayers(res.data.players));
  });

  useSocket("auction_complete", () => { setAuctionDone(true); setActivePlayer(null); });
  useSocket("auction_ended", () => { setAuctionDone(true); navigate(`/fantasy/${code}/simulation`); });
  useSocket("timer_updated", (data) => { setTimerDuration(data.duration); });

  const pendingPlayers = players.filter(p => p.status === "pending");
  const soldPlayers = players.filter(p => p.status === "sold");
  
  const mySpent = spents[myTeam] || 0;
  const myRemaining = budget - mySpent;
  const mySquad = squads[myTeam] || [];

  const handleBid = async (amount) => {
    if (!activePlayer || timer === 0) return;
    if (mySpent + amount > budget) return showNotif("Budget exceeded! 💸", "#FF3B3B");
    if (currentHighest && amount <= currentHighest.amount) return showNotif("Must bid higher than current!", "#FF3B3B");
    try {
      await API.post(`/fantasy/${code}/auction/bid`, {
        playerId: activePlayer.id, team: myTeam, amount,
        userId: user.id, userName: user.name,
        timerDuration,
      });
      setMyCurrentBid(amount);
    } catch (err) {
      showNotif(err.response?.data?.detail || "Bid failed!", "#FF3B3B");
    }
  };

  const handleStartAuction = async () => {
    await API.post(`/fantasy/${code}/auction/start`, { timerDuration });
  };

  const handleTimerChange = async (val) => {
    setTimerDuration(val);
    socket.emit("auction_timer_start", { roomCode: code, duration: val });
    await API.post(`/fantasy/${code}/auction/set-timer`, { duration: val });
  };

  // Smart incremental bids
  const base = activePlayer?.base_price || CR;
  const currentPrice = currentHighest?.amount || base;
  const bidRaises = [
    { label: "BASE / MATCH", amount: currentHighest ? currentPrice + Math.round(base * 0.1) : base },
    { label: `+${fmt(Math.round(base * 0.25))}`, amount: currentPrice + Math.round(base * 0.25) },
    { label: `+${fmt(Math.round(base * 0.5))}`, amount: currentPrice + Math.round(base * 0.5) },
    { label: `+${fmt(base)}`, amount: currentPrice + base },
  ];

  const myDetails = getTeamDetails(myTeam);

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col" style={BG}>

      {/* Notification overlay */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-bold text-center border-2 shadow-2xl transition-all duration-300 uppercase"
          style={{ background: "#111", borderColor: notification.color, color: notification.color, fontFamily: "monospace", maxWidth: "90vw" }}>
          {notification.msg}
        </div>
      )}

      {/* End Confirm Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="rounded-3xl p-6 text-center max-w-sm w-full mx-4 border-2 border-red-500/30 bg-[#111] shadow-2xl">
            <p className="text-3xl font-black mb-2 uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FF3B3B" }}>END AUCTION?</p>
            <p className="text-gray-400 text-xs mb-6 font-semibold" style={{ fontFamily: "monospace" }}>
              {pendingPlayers.length} players remain unsold. Transition to simulation stage now?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 border border-white/10 hover:bg-white/5 transition"
                style={{ fontFamily: "monospace" }}>CANCEL</button>
              <button onClick={async () => { setShowEndConfirm(false); await API.post(`/fantasy/${code}/auction/end`); }}
                className="flex-1 py-3 rounded-xl font-black text-black bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 transition"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                END & SIMULATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#111]/80 backdrop-blur-md border-b border-white/5">
        <div>
          <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-0.5" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <p className="font-black text-2xl tracking-wider uppercase text-[#FFD700] flex items-center gap-1.5" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            <span>🔨 LIVE DRAFT</span>
          </p>
        </div>
        <div className="text-center bg-white/5 border border-white/5 px-4 py-1.5 rounded-full flex items-center gap-2">
          <span className="text-lg">{myDetails.emoji}</span>
          <p className="font-extrabold text-sm tracking-wider uppercase" style={{ color: myDetails.color }}>{myDetails.label}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5" style={{ fontFamily: "monospace" }}>REMAINING WALLET</p>
          <p className="font-extrabold text-base" style={{ color: "#00FF88", fontFamily: "monospace" }}>{fmt(myRemaining)}</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">

        {/* Dynamic Multi-Franchise Budget Cards */}
        <div>
          <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "monospace" }}>
            FRANCHISE WALLETS & SQUADS ({activeTeams.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {activeTeams.map((t) => {
              const details = getTeamDetails(t);
              const teamSquad = squads[t] || [];
              const teamSpent = spents[t] || 0;
              const isMyFranchise = t === myTeam;
              return (
                <div key={t} className="p-3.5 rounded-2xl text-center relative overflow-hidden transition-all duration-300 border flex flex-col gap-0.5"
                  style={{
                    background: isMyFranchise ? `${details.color}15` : "#111",
                    borderColor: isMyFranchise ? details.color : "#222",
                    boxShadow: isMyFranchise ? `0 0 15px ${details.color}22` : "none"
                  }}>
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: details.color }} />
                  <p className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: details.color }}>
                    {details.emoji} {details.key}
                  </p>
                  <p className="font-black text-xl mt-0.5" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    {teamSquad.length}/{squadSize}
                  </p>
                  <p className="text-[10px] text-gray-400 font-extrabold leading-none" style={{ fontFamily: "monospace" }}>
                    {fmt(budget - teamSpent)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Live Timer Controller */}
        {isHost && !activePlayer && !auctionDone && (
          <div className="rounded-2xl p-4 bg-[#111] border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-500 font-bold tracking-widest uppercase" style={{ fontFamily: "monospace" }}>SET BID TIMER SPEED</p>
              <p className="font-black text-xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>{timerDuration} seconds</p>
            </div>
            <input type="range" min="3" max="60" step="1" value={timerDuration}
              onChange={(e) => handleTimerChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-black cursor-pointer accent-[#FFD700]" />
            <div className="flex justify-between text-[10px] text-gray-500 font-bold mt-1.5" style={{ fontFamily: "monospace" }}>
              <span>⚡ 3s Fast</span><span>15s Standard</span><span>30s Slow</span><span>60s Marathon</span>
            </div>
          </div>
        )}

        {/* Active Player Card */}
        {activePlayer ? (
          <div className="rounded-3xl p-6 border-2 border-[#FFD700] bg-[#111] shadow-2xl flex flex-col gap-6 relative overflow-hidden fade-in">
            {/* Background glowing gradient */}
            <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full opacity-5 pointer-events-none"
              style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />

            {/* Timer bar */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <span className="text-xs font-bold tracking-widest text-[#FFD700] uppercase" style={{ fontFamily: "monospace" }}>🔥 CURRENT NOMINEE</span>
              <div className="flex items-center gap-2">
                <div className="w-28 h-2 rounded-full overflow-hidden bg-black">
                  <div className="h-full rounded-full transition-all duration-1000" style={{
                    width: `${(timer / timerDuration) * 100}%`,
                    background: timer <= 5 ? "#FF3B3B" : timer <= 10 ? "#FF8C00" : "#FFD700"
                  }} />
                </div>
                <span className="text-2xl font-black" style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  color: timer <= 5 ? "#FF3B3B" : timer <= 10 ? "#FF8C00" : "#FFD700",
                  minWidth: "40px"
                }}>{timer}s</span>
              </div>
            </div>

            {/* Nominee profile details */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2.5 mb-1.5">
                <p className="text-4xl font-extrabold tracking-wide" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  {activePlayer.player_name}
                </p>
                {activePlayer.overseas && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold tracking-wider bg-[#4488FF]/10 text-[#4488FF] border border-[#4488FF]/20" style={{ fontFamily: "monospace" }}>
                    🌍 OS
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{activePlayer.role}</p>
              <p className="text-xs font-bold mt-1 text-[#FFD700] uppercase tracking-wider" style={{ fontFamily: "monospace" }}>BASE PRICE: {fmt(activePlayer.base_price)}</p>

              {/* Player Stats */}
              {activePlayer.stats && (
                <div className="flex justify-center gap-3 mt-4">
                  {Object.entries(activePlayer.stats).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="text-center px-4 py-2 rounded-2xl bg-black border border-white/5">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5" style={{ fontFamily: "monospace" }}>{k.replace(/_/g, " ")}</p>
                      <p className="font-extrabold text-sm text-[#FFD700]">{k === "form_factor" ? `${v}x` : v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Bidding Arena */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Current High Bid Box */}
              <div className="text-center py-4 rounded-2xl bg-black border border-white/5 shadow-inner">
                {currentHighest ? (
                  <>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1" style={{ fontFamily: "monospace" }}>
                      CURRENT LEADER — {getTeamDetails(currentHighest.team).emoji} TEAM {currentHighest.team}
                    </p>
                    <p className="text-3xl font-black uppercase" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: getTeamDetails(currentHighest.team).color }}>
                      {fmt(currentHighest.amount)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1" style={{ fontFamily: "monospace" }}>OPENING BID</p>
                    <p className="text-3xl font-black text-[#FFD700]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      {fmt(activePlayer.base_price)}
                    </p>
                  </>
                )}
              </div>

              {/* Interactive Bid raises */}
              {myTeam && timer > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {bidRaises.map((b, i) => (
                    <button key={i} onClick={() => handleBid(b.amount)}
                      disabled={b.amount > myRemaining + mySpent || (currentHighest && b.amount <= currentHighest.amount && i > 0)}
                      className="py-3 rounded-2xl font-black text-sm flex flex-col justify-center items-center gap-0.5 transition-all duration-300 hover:opacity-95 shadow-md active:scale-95 disabled:opacity-20"
                      style={{
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        background: myDetails.textColor === "#000" ? `linear-gradient(135deg, ${myDetails.color}, ${myDetails.secondaryColor || '#FF8C00'})` : `linear-gradient(135deg, ${myDetails.color}, ${myDetails.secondaryColor || '#0044CC'})`,
                        color: myDetails.textColor || "white"
                      }}>
                      <span className="tracking-wide text-xs">{b.label}</span>
                      <span className="text-[10px] opacity-80 font-bold font-mono tracking-wider">{fmt(b.amount)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs font-semibold text-gray-500 uppercase tracking-widest" style={{ fontFamily: "monospace" }}>
                  {timer === 0 ? "⏳ Finalizing Bid..." : "🔒 SPECTATOR MODE"}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Ready / Complete Banner */
          <div className="rounded-3xl p-8 text-center bg-[#111] border border-white/5 shadow-2xl flex flex-col items-center justify-center gap-4">
            {auctionDone ? (
              <>
                <p className="text-6xl animate-bounce">🏆</p>
                <div>
                  <p className="font-black text-3xl uppercase tracking-wider text-[#FFD700] mb-1" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>DRAFT COMPLETE!</p>
                  <p className="text-gray-500 font-semibold text-xs tracking-widest uppercase mb-4" style={{ fontFamily: "monospace" }}>Squads are locked and loaded for the season.</p>
                </div>
                <button onClick={() => navigate(`/fantasy/${code}/simulation`)}
                  className="w-full max-w-sm py-4 rounded-2xl font-black text-2xl tracking-widest uppercase text-black bg-gradient-to-r from-[#FFD700] to-[#FF8C00] shadow-xl hover:scale-102 transition"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  ENTER SIMULATOR 🏟️
                </button>
              </>
            ) : (
              <>
                <p className="text-6xl my-2">🔨</p>
                <div>
                  <p className="font-extrabold text-xl uppercase tracking-wider text-white mb-0.5">READY FOR DRAFT</p>
                  <p className="text-xs text-gray-500 font-bold tracking-widest uppercase" style={{ fontFamily: "monospace" }}>{pendingPlayers.length} STARS REGISTERED IN POOL</p>
                </div>
                {isHost ? (
                  <button onClick={handleStartAuction}
                    className="w-full max-w-xs py-4 rounded-2xl font-black text-xl tracking-widest uppercase text-black bg-gradient-to-r from-[#FFD700] to-[#FF8C00] shadow-xl transition"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    DRAFT NOMINEE 🔨
                  </button>
                ) : (
                  <p className="text-xs font-bold tracking-widest uppercase text-[#FFD700] live-pulse mt-2" style={{ fontFamily: "monospace" }}>
                    ● Waiting for Host to Nominate Player...
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* My Squad */}
          <div className="rounded-3xl p-5 bg-[#111] border border-white/5 flex flex-col gap-4 shadow-lg">
            <p className="text-xs text-gray-500 font-bold tracking-widest uppercase" style={{ fontFamily: "monospace" }}>
              MY SQUAD — {myDetails.emoji} {myDetails.key} ({mySquad.length}/{squadSize})
            </p>
            {mySquad.length === 0 ? (
              <p className="text-xs text-gray-700 text-center py-6 font-bold" style={{ fontFamily: "monospace" }}>No draft picks secured yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {mySquad.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm px-3.5 py-2 rounded-xl bg-black border border-white/5 shadow-inner" style={{ fontFamily: "monospace" }}>
                    <span className="flex items-center gap-2 font-bold">
                      <span className="text-gray-300 font-semibold">{i+1}.</span>
                      <span>{p.player_name}</span>
                      {p.role && <span className="text-[9px] text-gray-500 font-extrabold uppercase">({p.role?.slice(0,3)})</span>}
                    </span>
                    <span style={{ color: "#FFD700" }} className="font-extrabold">{fmt(p.bought_for)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sold log */}
          <div className="rounded-3xl p-5 bg-[#111] border border-white/5 flex flex-col gap-4 shadow-lg">
            <p className="text-xs text-gray-500 font-bold tracking-widest uppercase" style={{ fontFamily: "monospace" }}>DRAFT TRANSACTION HISTORY ({soldPlayers.length})</p>
            {soldPlayers.length === 0 ? (
              <p className="text-xs text-gray-700 text-center py-6 font-bold" style={{ fontFamily: "monospace" }}>No completed transactions.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {soldPlayers.map((p, i) => {
                  const details = getTeamDetails(p.sold_to);
                  return (
                    <div key={i} className="flex items-center justify-between px-3.5 py-2 rounded-xl text-sm bg-black border border-white/5 shadow-inner" style={{ fontFamily: "monospace" }}>
                      <span className="flex items-center gap-1.5 font-bold">
                        {p.player_name}
                        {p.overseas && <span className="text-xs">🌍</span>}
                      </span>
                      <span style={{ color: details.color }} className="font-extrabold flex items-center gap-1.5">
                        <span>{details.emoji} {details.key}</span>
                        <span className="text-gray-500 font-medium">·</span>
                        <span>{fmt(p.sold_price)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* End draft button */}
        {isHost && !auctionDone && (
          <button onClick={() => setShowEndConfirm(true)}
            className="w-full py-4 mt-2 rounded-2xl font-black tracking-widest uppercase text-red-500 hover:bg-red-500/10 border-2 border-red-500/30 hover:border-red-500 transition-all duration-300"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            🏁 SKIP REMAINING DRAFT & SIMULATE
          </button>
        )}
      </div>
    </div>
  );
}