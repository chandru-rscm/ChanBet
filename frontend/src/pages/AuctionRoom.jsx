import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import API from "../../services/api";
import socket from "../../services/socket";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

const CR = 10_000_000;
const fmt = (n) => {
  if (n >= CR) return `₹${(n / CR).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function AuctionRoom() {
  const { code } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  const [highestBid, setHighestBid] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [squadA, setSquadA] = useState([]);
  const [squadB, setSquadB] = useState([]);
  const [budget, setBudget] = useState(0);
  const [spentA, setSpentA] = useState(0);
  const [spentB, setSpentB] = useState(0);
  const [timer, setTimer] = useState(0);
  const [bidLog, setBidLog] = useState([]);
  const [squadSize, setSquadSize] = useState(11);
  const timerRef = useRef(null);
  const navigate = useNavigate();

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

      const [sA, sB] = await Promise.all([
        API.get(`/fantasy/${code}/squad/A`),
        API.get(`/fantasy/${code}/squad/B`),
      ]);
      setSquadA(sA.data.squad);
      setSpentA(sA.data.spent);
      setSquadB(sB.data.squad);
      setSpentB(sB.data.spent);
    };
    fetchAll();
    socket.emit("join_fantasy_room", { roomCode: code });
  }, [code]);

  // Timer countdown
  const startTimer = (seconds = 10) => {
    setTimer(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Socket listeners
  useSocket("auction_next", (data) => {
    setActivePlayer(data.player);
    setHighestBid(null);
    setBidLog([]);
    startTimer(10);
  });

  useSocket("bid_placed", (data) => {
    setHighestBid(data.highest);
    setBidLog(prev => [...prev, { team: data.team, amount: data.amount, userName: data.userName }]);
    startTimer(10); // reset timer on new bid
  });

  useSocket("player_sold", (data) => {
    setActivePlayer(null);
    clearInterval(timerRef.current);
    setTimer(0);
    // Refresh squads
    Promise.all([
      API.get(`/fantasy/${code}/squad/A`),
      API.get(`/fantasy/${code}/squad/B`),
    ]).then(([sA, sB]) => {
      setSquadA(sA.data.squad); setSpentA(sA.data.spent);
      setSquadB(sB.data.squad); setSpentB(sB.data.spent);
    });
    // Update players list
    API.get(`/fantasy/${code}/auction/players`).then(res => setPlayers(res.data.players));
  });

  useSocket("player_unsold", () => {
    setActivePlayer(null);
    clearInterval(timerRef.current);
    setTimer(0);
    API.get(`/fantasy/${code}/auction/players`).then(res => setPlayers(res.data.players));
  });

  const isHost = room?.host_id === user?.id;
  const pendingPlayers = players.filter(p => p.status === "pending");
  const soldPlayers = players.filter(p => p.status === "sold");

  const handleNextPlayer = async () => {
    if (pendingPlayers.length === 0) return alert("No more players!");
    const next = pendingPlayers[0];
    await API.post(`/fantasy/${code}/auction/next`, { playerId: next.id });
  };

  const handleBid = async (raise) => {
    if (!activePlayer) return;
    const current = highestBid?.amount || activePlayer.base_price;
    const amount = current + raise;
    const mySpent = myTeam === "A" ? spentA : spentB;
    if (mySpent + amount > budget) return alert("Budget exceeded! 💸");

    await API.post(`/fantasy/${code}/auction/bid`, {
      playerId: activePlayer.id,
      team: myTeam,
      amount,
      userId: user.id,
      userName: user.name,
    });
  };

  const handleSell = async () => {
    if (!activePlayer) return;
    await API.post(`/fantasy/${code}/auction/sell`, { playerId: activePlayer.id });
  };

  const handleStartSim = () => navigate(`/fantasy/${code}/simulation`);

  const mySpent = myTeam === "A" ? spentA : spentB;
  const myRemaining = budget - mySpent;

  return (
    <div className="min-h-screen bg-black text-white relative" style={BG}>

      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#111", borderBottom: "1px solid #222" }}>
        <div>
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <p className="font-black text-lg" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
            🔨 AUCTION
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>MY TEAM</p>
          <p className="font-black text-xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: myTeam === "A" ? "#FF3B3B" : "#4488FF" }}>
            TEAM {myTeam || "?"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>REMAINING</p>
          <p className="font-bold text-sm" style={{ color: "#00FF88" }}>{fmt(myRemaining)}</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">

        {/* Progress */}
        <div className="flex gap-2 mb-4 fade-in">
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "#1a0a0a", border: "1px solid #FF3B3B33" }}>
            <p className="text-xs" style={{ fontFamily: "monospace", color: "#FF3B3B" }}>TEAM A</p>
            <p className="font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FF3B3B" }}>{squadA.length}/{squadSize}</p>
            <p className="text-xs text-gray-600">{fmt(spentA)} spent</p>
          </div>
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "#1a1a1a", border: "1px solid #FFD70033" }}>
            <p className="text-xs" style={{ fontFamily: "monospace", color: "#FFD700" }}>PLAYERS LEFT</p>
            <p className="font-black text-2xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>{pendingPlayers.length}</p>
          </div>
          <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "#0a0a1a", border: "1px solid #4488FF33" }}>
            <p className="text-xs" style={{ fontFamily: "monospace", color: "#4488FF" }}>TEAM B</p>
            <p className="font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#4488FF" }}>{squadB.length}/{squadSize}</p>
            <p className="text-xs text-gray-600">{fmt(spentB)} spent</p>
          </div>
        </div>

        {/* Active Player Card */}
        {activePlayer ? (
          <div className="rounded-2xl p-5 mb-4 fade-in" style={{ background: "#111", border: "2px solid #FFD700", boxShadow: "0 0 30px #FFD70022" }}>

            {/* Timer */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs tracking-widest" style={{ fontFamily: "monospace", color: "#FFD700" }}>🔨 ON AUCTION</span>
              <span className="text-2xl font-black" style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                color: timer <= 3 ? "#FF3B3B" : "#FFD700"
              }}>
                {timer > 0 ? `${timer}s` : "SOLD!"}
              </span>
            </div>

            {/* Player Info */}
            <div className="text-center mb-4">
              <p className="text-3xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{activePlayer.player_name}</p>
              <p className="text-sm text-gray-400">{activePlayer.role}</p>
              {activePlayer.stats && (
                <div className="flex justify-center gap-4 mt-2">
                  {Object.entries(activePlayer.stats).slice(0, 3).map(([k, v]) => (
                    <div key={k} className="text-center">
                      <p className="text-xs text-gray-600 uppercase" style={{ fontFamily: "monospace" }}>{k}</p>
                      <p className="font-bold text-sm" style={{ color: "#FFD700" }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Bid */}
            <div className="text-center py-3 rounded-xl mb-4" style={{ background: "#1a1a1a" }}>
              <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>
                {highestBid ? `HIGHEST BID — TEAM ${highestBid.team}` : "BASE PRICE"}
              </p>
              <p className="text-3xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
                {fmt(highestBid?.amount || activePlayer.base_price)}
              </p>
            </div>

            {/* Bid Log */}
            {bidLog.length > 0 && (
              <div className="mb-4 max-h-24 overflow-y-auto">
                {bidLog.slice(-3).reverse().map((b, i) => (
                  <p key={i} className="text-xs py-1" style={{ fontFamily: "monospace", color: b.team === "A" ? "#FF3B3B" : "#4488FF" }}>
                    TEAM {b.team} → {fmt(b.amount)} ({b.userName})
                  </p>
                ))}
              </div>
            )}

            {/* Bid Buttons */}
            {myTeam && timer > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[CR/2, CR, 2*CR].map((raise) => (
                  <button key={raise} onClick={() => handleBid(raise)}
                    className="py-3 rounded-xl font-black text-sm transition"
                    style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      background: myTeam === "A" ? "#FF3B3B" : "#4488FF",
                      color: "white"
                    }}>
                    +{fmt(raise)}
                  </button>
                ))}
              </div>
            )}

            {/* Host controls */}
            {isHost && (
              <button onClick={handleSell}
                className="w-full py-3 rounded-xl font-black tracking-widest"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
                🔨 SOLD! / UNSOLD
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center mb-4 fade-in" style={{ background: "#111", border: "1px solid #222" }}>
            {pendingPlayers.length > 0 ? (
              <>
                <p className="text-5xl mb-3">🔨</p>
                <p className="text-gray-600 tracking-widest text-sm mb-2" style={{ fontFamily: "monospace" }}>
                  {pendingPlayers.length} PLAYERS WAITING
                </p>
                {isHost && (
                  <button onClick={handleNextPlayer}
                    className="px-8 py-3 rounded-xl font-black tracking-widest transition"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
                    NEXT PLAYER →
                  </button>
                )}
                {!isHost && (
                  <p className="text-xs live-pulse" style={{ fontFamily: "monospace", color: "#FFD700" }}>
                    ● WAITING FOR HOST...
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-5xl mb-3">🎉</p>
                <p className="font-black text-2xl mb-4" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
                  AUCTION COMPLETE!
                </p>
                {isHost && (
                  <button onClick={handleStartSim}
                    className="px-8 py-3 rounded-xl font-black tracking-widest"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
                    START SIMULATION 🏟️
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Sold Players */}
        {soldPlayers.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "#111", border: "1px solid #222" }}>
            <p className="text-xs text-gray-600 tracking-widest mb-3" style={{ fontFamily: "monospace" }}>SOLD PLAYERS ({soldPlayers.length})</p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {soldPlayers.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "#1a1a1a" }}>
                  <div>
                    <p className="font-bold text-sm">{p.player_name}</p>
                    <p className="text-xs text-gray-600">{p.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: p.sold_to === "A" ? "#FF3B3B" : "#4488FF" }}>
                      TEAM {p.sold_to}
                    </p>
                    <p className="text-xs" style={{ color: "#FFD700" }}>{fmt(p.sold_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}