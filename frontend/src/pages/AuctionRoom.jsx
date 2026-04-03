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

export default function AuctionRoom() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [squadA, setSquadA] = useState([]);
  const [squadB, setSquadB] = useState([]);
  const [budget, setBudget] = useState(0);
  const [spentA, setSpentA] = useState(0);
  const [spentB, setSpentB] = useState(0);
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

  useEffect(() => {
    const fetchAll = async () => {
      const [roomRes, auctionRes, myTeamRes] = await Promise.all([
        API.get(`/fantasy/${code}`),
        API.get(`/fantasy/${code}/auction/players`),
        API.get(`/fantasy/${code}/players`),
      ]);
      setRoom(roomRes.data.room);
      setPlayers(auctionRes.data.players);
      setBudget(auctionRes.data.budget);
      setSquadSize(auctionRes.data.squad_size);
      const me = myTeamRes.data.players.find(p => p.user_id === user?.id);
      setMyTeam(me?.team);
      refreshSquads();
    };
    fetchAll();
    socket.emit("join_fantasy_room", { roomCode: code });
  }, [code]);

  const refreshSquads = async () => {
    const [sA, sB] = await Promise.all([
      API.get(`/fantasy/${code}/squad/A`),
      API.get(`/fantasy/${code}/squad/B`),
    ]);
    setSquadA(sA.data.squad); setSpentA(sA.data.spent);
    setSquadB(sB.data.squad); setSpentB(sB.data.spent);
  };

  // Server-driven timer — starts when host broadcasts
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
    showNotif(`Team ${data.team} bid ${fmt(data.amount)}!`, data.team === "A" ? "#FF3B3B" : "#4488FF");
  });

  useSocket("player_sold", (data) => {
    clearTimeout(sellTimeoutRef.current);
    clearInterval(timerRef.current);
    setTimer(0); setActivePlayer(null); setMyCurrentBid(0); setCurrentHighest(null);
    showNotif(`${data.playerName} → Team ${data.team} ${fmt(data.amount)} ${data.stealLabel}`, data.team === "A" ? "#FF3B3B" : "#4488FF");
    API.get(`/fantasy/${code}/auction/players`).then(res => setPlayers(res.data.players));
    refreshSquads();
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

  // Host timer setting broadcast
  useSocket("timer_updated", (data) => { setTimerDuration(data.duration); });

  const isHost = room?.host_id === user?.id;
  const pendingPlayers = players.filter(p => p.status === "pending");
  const soldPlayers = players.filter(p => p.status === "sold");
  const mySpent = myTeam === "A" ? spentA : spentB;
  const myRemaining = budget - mySpent;
  const mySquad = myTeam === "A" ? squadA : squadB;

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
    // Broadcast new timer to all players
    socket.emit("auction_timer_start", { roomCode: code, duration: val });
    await API.post(`/fantasy/${code}/auction/set-timer`, { duration: val });
  };

  // Smart bid raises based on base price
  const base = activePlayer?.base_price || CR;
  const bidRaises = [
    { label: "BASE", amount: base },
    { label: `+${fmt(Math.round(base * 0.5))}`, amount: Math.round((currentHighest?.amount || base) + base * 0.5) },
    { label: `+${fmt(base)}`, amount: Math.round((currentHighest?.amount || base) + base) },
    { label: `+${fmt(base * 2)}`, amount: Math.round((currentHighest?.amount || base) + base * 2) },
  ];

  const teamColor = myTeam === "A" ? "#FF3B3B" : "#4488FF";
  const teamGrad = myTeam === "A" ? "linear-gradient(135deg, #FF3B3B, #CC0000)" : "linear-gradient(135deg, #4488FF, #0044CC)";

  return (
    <div className="min-h-screen bg-black text-white relative" style={BG}>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-bold text-center fade-in"
          style={{ background: "#111", border: `2px solid ${notification.color}`, color: notification.color, fontFamily: "monospace", maxWidth: "90vw", zIndex: 999 }}>
          {notification.msg}
        </div>
      )}

      {/* End Confirm Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#000000cc" }}>
          <div className="rounded-2xl p-6 text-center max-w-sm w-full mx-4" style={{ background: "#111", border: "2px solid #FFD700" }}>
            <p className="text-xl font-black mb-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>END AUCTION?</p>
            <p className="text-gray-400 text-sm mb-6" style={{ fontFamily: "monospace" }}>
              {pendingPlayers.length} players unsold. Move to simulation now.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 rounded-xl font-black"
                style={{ fontFamily: "monospace", background: "#222", color: "#555", border: "1px solid #333" }}>CANCEL</button>
              <button onClick={async () => { setShowEndConfirm(false); await API.post(`/fantasy/${code}/auction/end`); }}
                className="flex-1 py-3 rounded-xl font-black"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
                END & SIMULATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#111", borderBottom: "1px solid #222" }}>
        <div>
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <p className="font-black text-lg" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>🔨 AUCTION</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>MY TEAM</p>
          <p className="font-black text-xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: teamColor }}>TEAM {myTeam || "?"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>REMAINING</p>
          <p className="font-bold text-sm" style={{ color: "#00FF88" }}>{fmt(myRemaining)}</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">

        {/* Progress */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "#1a0a0a", border: "1px solid #FF3B3B33" }}>
            <p className="text-xs" style={{ fontFamily: "monospace", color: "#FF3B3B" }}>TEAM A</p>
            <p className="font-black text-xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FF3B3B" }}>{squadA.length}/{squadSize}</p>
            <p className="text-xs text-gray-600">{fmt(spentA)}</p>
          </div>
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "#1a1a1a", border: "1px solid #FFD70033" }}>
            <p className="text-xs" style={{ fontFamily: "monospace", color: "#FFD700" }}>LEFT</p>
            <p className="font-black text-2xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>{pendingPlayers.length}</p>
          </div>
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "#0a0a1a", border: "1px solid #4488FF33" }}>
            <p className="text-xs" style={{ fontFamily: "monospace", color: "#4488FF" }}>TEAM B</p>
            <p className="font-black text-xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#4488FF" }}>{squadB.length}/{squadSize}</p>
            <p className="text-xs text-gray-600">{fmt(spentB)}</p>
          </div>
        </div>

        {/* Timer Slider — host only, before auction starts */}
        {isHost && !activePlayer && !auctionDone && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "#111", border: "1px solid #333" }}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-600 tracking-widest" style={{ fontFamily: "monospace" }}>BID TIMER</p>
              <p className="font-black text-xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>{timerDuration}s</p>
            </div>
            <input type="range" min="3" max="60" step="1" value={timerDuration}
              onChange={(e) => handleTimerChange(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#FFD700" }} />
            <div className="flex justify-between text-xs text-gray-700 mt-1" style={{ fontFamily: "monospace" }}>
              <span>3s</span><span>15s</span><span>30s</span><span>60s</span>
            </div>
          </div>
        )}

        {/* Active Player Card */}
        {activePlayer ? (
          <div className="rounded-2xl p-5 mb-4 fade-in" style={{ background: "#111", border: "2px solid #FFD700", boxShadow: "0 0 30px #FFD70022" }}>

            {/* Timer bar */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs tracking-widest" style={{ fontFamily: "monospace", color: "#FFD700" }}>🔨 ON AUCTION</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: "#222" }}>
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

            {/* Player info */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <p className="text-3xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  {activePlayer.player_name}
                </p>
                {activePlayer.overseas && (
                  <span className="text-xs px-2 py-1 rounded-full font-bold"
                    style={{ background: "#4488FF22", color: "#4488FF", border: "1px solid #4488FF55", fontFamily: "monospace" }}>
                    🌍 OS
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{activePlayer.role}</p>
              <p className="text-xs mt-1" style={{ color: "#FFD700", fontFamily: "monospace" }}>BASE: {fmt(activePlayer.base_price)}</p>

              {/* Stats */}
              {activePlayer.stats && (
                <div className="flex justify-center gap-3 mt-3 flex-wrap">
                  {Object.entries(activePlayer.stats).slice(0, 3).map(([k, v]) => (
                    <div key={k} className="text-center px-3 py-1 rounded-lg" style={{ background: "#1a1a1a" }}>
                      <p className="text-xs text-gray-600 uppercase" style={{ fontFamily: "monospace" }}>{k.replace(/_/g, " ")}</p>
                      <p className="font-bold text-sm" style={{ color: "#FFD700" }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current highest bid */}
            <div className="text-center py-3 rounded-xl mb-4" style={{ background: "#1a1a1a" }}>
              {currentHighest ? (
                <>
                  <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>
                    HIGHEST — TEAM {currentHighest.team} ({currentHighest.userName})
                  </p>
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: currentHighest.team === "A" ? "#FF3B3B" : "#4488FF" }}>
                    {fmt(currentHighest.amount)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>STARTING BID</p>
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
                    {fmt(activePlayer.base_price)}
                  </p>
                </>
              )}
            </div>

            {/* My bid status */}
            {myCurrentBid > 0 && (
              <div className="text-center py-2 rounded-xl mb-3" style={{ background: "#0a2a0a", border: "1px solid #00FF8844" }}>
                <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>YOUR BID</p>
                <p className="font-bold" style={{ color: "#00FF88" }}>{fmt(myCurrentBid)}</p>
              </div>
            )}

            {/* Bid buttons */}
            {myTeam && timer > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {bidRaises.map((b, i) => (
                  <button key={i} onClick={() => handleBid(b.amount)}
                    disabled={b.amount > myRemaining + mySpent || (currentHighest && b.amount <= currentHighest.amount && i > 0)}
                    className="py-3 rounded-xl font-black text-sm transition disabled:opacity-30"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: teamGrad, color: "white" }}>
                    {b.label}
                    <br /><span className="text-xs opacity-80">{fmt(b.amount)}</span>
                  </button>
                ))}
              </div>
            )}
            {timer === 0 && <p className="text-center text-xs mt-2" style={{ fontFamily: "monospace", color: "#555" }}>Finalizing...</p>}
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center mb-4" style={{ background: "#111", border: "1px solid #222" }}>
            {auctionDone ? (
              <>
                <p className="text-5xl mb-3">🎉</p>
                <p className="font-black text-2xl mb-4" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>AUCTION COMPLETE!</p>
                <button onClick={() => navigate(`/fantasy/${code}/simulation`)}
                  className="w-full py-4 rounded-xl font-black text-xl tracking-widest"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
                  START SIMULATION 🏟️
                </button>
              </>
            ) : (
              <>
                <p className="text-5xl mb-3">🔨</p>
                <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: "monospace" }}>{pendingPlayers.length} PLAYERS WAITING</p>
                {isHost ? (
                  <button onClick={handleStartAuction}
                    className="w-full px-8 py-3 rounded-xl font-black tracking-widest"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
                    START AUCTION 🔨
                  </button>
                ) : (
                  <p className="text-xs live-pulse" style={{ fontFamily: "monospace", color: "#FFD700" }}>● WAITING FOR HOST...</p>
                )}
              </>
            )}
          </div>
        )}

        {/* My Squad */}
        <div className="rounded-2xl p-4 mb-3" style={{ background: "#111", border: "1px solid #222" }}>
          <p className="text-xs text-gray-600 tracking-widest mb-3" style={{ fontFamily: "monospace" }}>
            MY SQUAD — TEAM {myTeam} ({mySquad.length}/{squadSize})
          </p>
          {mySquad.length === 0 ? (
            <p className="text-xs text-gray-700 text-center" style={{ fontFamily: "monospace" }}>No players yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {mySquad.map((p, i) => (
                <div key={i} className="flex justify-between text-sm px-2 py-1 rounded-lg" style={{ background: "#1a1a1a" }}>
                  <span className="flex items-center gap-1">
                    {p.player_name}
                    {p.role && <span className="text-xs text-gray-600">({p.role?.slice(0,3)})</span>}
                  </span>
                  <span style={{ color: "#FFD700", fontFamily: "monospace" }}>{fmt(p.bought_for)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sold log */}
        {soldPlayers.length > 0 && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: "#111", border: "1px solid #222" }}>
            <p className="text-xs text-gray-600 tracking-widest mb-2" style={{ fontFamily: "monospace" }}>SOLD ({soldPlayers.length})</p>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {soldPlayers.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1 rounded-lg text-sm" style={{ background: "#1a1a1a" }}>
                  <span className="flex items-center gap-1">
                    {p.player_name}
                    {p.overseas && <span className="text-xs" style={{ color: "#4488FF" }}>🌍</span>}
                  </span>
                  <span style={{ color: p.sold_to === "A" ? "#FF3B3B" : "#4488FF", fontFamily: "monospace" }}>
                    T{p.sold_to} · {fmt(p.sold_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End auction */}
        {isHost && !auctionDone && (
          <button onClick={() => setShowEndConfirm(true)}
            className="w-full py-3 rounded-xl font-black tracking-widest"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "#111", border: "1px solid #FF3B3B", color: "#FF3B3B" }}>
            🏁 END AUCTION & SIMULATE
          </button>
        )}
      </div>
    </div>
  );
}