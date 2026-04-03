import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import socket from "../services/socket";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

const CR = 10_000_000;
const fmt = (n) => n >= CR ? `₹${(n/CR).toFixed(1)}Cr` : `₹${(n||0).toLocaleString("en-IN")}`;

// Seeded random for true randomness
function rand(min = 0, max = 100) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const COMMENTARY = {
  six:    ["💥 MASSIVE SIX! That's gone into the crowd!", "🚀 INTO THE STANDS! What a hit!", "💣 MAXIMUM! Crowd goes absolutely wild!", "🔥 SIX! That's out of the stadium!", "👊 SMASHED! Six runs!"],
  four:   ["🏏 FOUR! Cracking shot through the covers!", "⚡ FOUR! Sliced perfectly through the gap!", "🎯 FOUR! Beautifully timed!", "👏 Four runs! Driven elegantly!", "💨 Racing to the boundary!"],
  wicket: ["💀 OUT! Big wicket falls!", "😱 BOWLED HIM! What a delivery!", "🎯 CAUGHT! Brilliant catch!", "🏆 LBW! Plumb in front!", "🔴 GONE! The stumps are shattered!"],
  dot:    ["🛡️ Good defensive shot.", "Block and leave.", "Dot ball — pressure building.", "Tight line, no room to hit.", "Defended solidly.", "Played back to the bowler."],
  single: ["✅ Quick single taken.", "Smart running between the wickets!", "Nudged for one.", "Rotated strike well."],
  two:    ["✌️ Two runs! Good running!", "Pushed into the gap for a couple.", "They've turned for two!"],
  wide:   ["😤 Wide ball! Extra added.", "Down the leg side, called wide.", "Too full and wide!"],
  noball: ["😬 NO BALL! Free hit coming up!", "Overstepped! Free hit next ball!"],
};

function simulateBall(batsman, bowler) {
  // Use actual player stats for weighted outcomes
  const sr = batsman?.stats?.sr || 130;
  const bowlerEconomy = bowler?.stats?.economy || 8;
  const bowlerAvg = bowler?.stats?.avg || 25;

  // Higher SR = more boundaries, lower economy = more dots/wickets
  const sixChance    = Math.max(3, Math.min(18, (sr - 100) / 8));
  const fourChance   = Math.max(8, Math.min(25, (sr - 100) / 5));
  const wicketChance = Math.max(3, Math.min(12, (30 - bowlerAvg) / 3));
  const dotChance    = Math.max(15, Math.min(40, (10 - bowlerEconomy) * 5 + 20));

  const r = rand();
  let cumulative = 0;

  cumulative += wicketChance / 100;
  if (r < cumulative) return { event: "wicket", runs: 0, commentary: pick(COMMENTARY.wicket) };

  cumulative += sixChance / 100;
  if (r < cumulative) return { event: "six", runs: 6, commentary: pick(COMMENTARY.six) };

  cumulative += fourChance / 100;
  if (r < cumulative) return { event: "four", runs: 4, commentary: pick(COMMENTARY.four) };

  cumulative += 0.03;
  if (r < cumulative) return { event: "wide", runs: 1, commentary: pick(COMMENTARY.wide) };

  cumulative += 0.02;
  if (r < cumulative) return { event: "noball", runs: 1, commentary: pick(COMMENTARY.noball) };

  cumulative += 0.12;
  if (r < cumulative) return { event: "two", runs: 2, commentary: pick(COMMENTARY.two) };

  cumulative += dotChance / 100;
  if (r < cumulative) return { event: "dot", runs: 0, commentary: pick(COMMENTARY.dot) };

  return { event: "single", runs: 1, commentary: pick(COMMENTARY.single) };
}

export default function SimulationPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom]           = useState(null);
  const [squadA, setSquadA]       = useState([]);
  const [squadB, setSquadB]       = useState([]);
  const [scoreA, setScoreA]       = useState(0);
  const [scoreB, setScoreB]       = useState(0);
  const [wicketsA, setWicketsA]   = useState(0);
  const [wicketsB, setWicketsB]   = useState(0);
  const [over, setOver]           = useState(0);
  const [ball, setBall]           = useState(0);
  const [isTeamATurn, setIsTeamA] = useState(true);
  const [commentary, setComm]     = useState([]);
  const [status, setStatus]       = useState("not_started");
  const [winner, setWinner]       = useState(null);
  const [running, setRunning]     = useState(false);
  const [speed, setSpeed]         = useState(800);

  const intervalRef    = useRef(null);
  const commentaryRef  = useRef(null);
  const stateRef       = useRef({});

  const TOTAL_OVERS = 20;

  useEffect(() => {
    const fetchAll = async () => {
      const [roomRes, sA, sB] = await Promise.all([
        API.get(`/fantasy/${code}`),
        API.get(`/fantasy/${code}/squad/A`),
        API.get(`/fantasy/${code}/squad/B`),
      ]);
      setRoom(roomRes.data.room);
      setSquadA(sA.data.squad);
      setSquadB(sB.data.squad);
    };
    fetchAll();
    socket.emit("join_fantasy_room", { roomCode: code });
  }, [code]);

  useEffect(() => {
    if (commentaryRef.current) commentaryRef.current.scrollTop = commentaryRef.current.scrollHeight;
  }, [commentary]);

  const addComm = (text, color = "#ccc") => {
    setComm(prev => [...prev.slice(-80), { text, color, id: Math.random() }]);
  };

  const stopSim = () => { clearInterval(intervalRef.current); setRunning(false); };

  const startSim = (squadARef, squadBRef) => {
    if (running) return;
    setRunning(true);
    setStatus("innings1");
    addComm("🏏 MATCH BEGINS! Team A batting first.", "#FFD700");

    // Initialise mutable state outside React for performance
    const state = {
      scoreA: 0, scoreB: 0,
      wicketsA: 0, wicketsB: 0,
      over: 0, ball: 0,
      teamATurn: true, innings1Done: false,
      sA: squadARef, sB: squadBRef,
    };
    stateRef.current = state;

    intervalRef.current = setInterval(() => {
      const s = stateRef.current;
      const batting = s.teamATurn ? s.sA : s.sB;
      const bowling = s.teamATurn ? s.sB : s.sA;

      // Pick random batsman & bowler each ball
      const batsmanIdx = Math.min(
        s.teamATurn ? s.wicketsA : s.wicketsB,
        batting.length - 1
      );
      const batsman = batting[batsmanIdx];
      const bowler  = bowling[Math.floor(Math.random() * Math.max(1, bowling.length))];

      const result = simulateBall(batsman, bowler);

      if (s.teamATurn) {
        if (result.event === "wicket") { s.wicketsA++; setWicketsA(s.wicketsA); }
        else { s.scoreA += result.runs; setScoreA(s.scoreA); }
      } else {
        if (result.event === "wicket") { s.wicketsB++; setWicketsB(s.wicketsB); }
        else { s.scoreB += result.runs; setScoreB(s.scoreB); }
      }

      // Ball counting (wide/noball don't count as a legal delivery)
      if (result.event !== "wide" && result.event !== "noball") {
        s.ball++;
        if (s.ball >= 6) { s.ball = 0; s.over++; }
      }
      setBall(s.ball); setOver(s.over);
      setIsTeamA(s.teamATurn);

      const overStr = `${s.over}.${s.ball}`;
      const bName = batsman?.player_name?.split(" ").pop() || "Bat";
      const bowlName = bowler?.player_name?.split(" ").pop() || "Bowl";
      addComm(
        `[${overStr}] ${bName} vs ${bowlName} — ${result.commentary}`,
        result.event === "wicket" ? "#FF3B3B" : result.event === "six" ? "#FFD700" : result.event === "four" ? "#00FF88" : "#ccc"
      );

      // Check innings/match end
      const maxWicketsA = Math.max(1, s.sA.length);
      const maxWicketsB = Math.max(1, s.sB.length);
      const allOut = s.teamATurn ? s.wicketsA >= maxWicketsA : s.wicketsB >= maxWicketsB;
      const oversUp = s.over >= TOTAL_OVERS;

      // Chase complete
      if (!s.teamATurn && s.scoreB > s.scoreA) {
        const remaining = (TOTAL_OVERS - s.over) * 6 - s.ball;
        addComm(`🎉 Team B wins with ${remaining} balls to spare!`, "#4488FF");
        endMatch(s.scoreA, s.scoreB);
        return;
      }

      if (allOut || oversUp) {
        if (s.teamATurn && !s.innings1Done) {
          s.innings1Done = true;
          s.teamATurn = false;
          s.over = 0; s.ball = 0;
          setOver(0); setBall(0);
          setStatus("innings2");
          setIsTeamA(false);
          addComm(`--- INNINGS BREAK ---`, "#333");
          addComm(`Team A: ${s.scoreA}/${s.wicketsA}`, "#FF3B3B");
          addComm(`Team B needs ${s.scoreA + 1} runs to win in ${TOTAL_OVERS} overs!`, "#4488FF");
        } else {
          endMatch(s.scoreA, s.scoreB);
        }
      }
    }, speed);
  };

  const endMatch = (sA, sB) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setStatus("finished");
    if (sA > sB) { setWinner("A"); addComm(`🏆 TEAM A WINS by ${sA - sB} runs!`, "#FFD700"); }
    else if (sB > sA) { setWinner("B"); addComm(`🏆 TEAM B WINS by ${sB - sA} runs!`, "#FFD700"); }
    else { setWinner("draw"); addComm("🤝 IT'S A TIE! Incredible match!", "#FFD700"); }
  };

  const isHost = room?.host_id === user?.id;

  return (
    <div className="min-h-screen bg-black text-white relative" style={BG}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#111", borderBottom: "1px solid #222" }}>
        <div>
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <p className="font-black text-lg" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>🏟️ SIMULATION</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>OVERS</p>
          <p className="font-black text-xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>{over}.{ball} / {TOTAL_OVERS}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ fontFamily: "monospace", color: status === "innings1" ? "#FF3B3B" : status === "innings2" ? "#4488FF" : "#FFD700" }}>
            {status === "innings1" ? "TEAM A BATTING" : status === "innings2" ? "TEAM B BATTING" : status === "finished" ? "FINISHED" : "READY"}
          </p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* Scoreboard */}
        <div className="rounded-2xl p-5 mb-4 fade-in" style={{ background: "#111", border: "2px solid #FFD700" }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-xs tracking-widest mb-1" style={{ fontFamily: "monospace", color: "#FF3B3B" }}>TEAM A</p>
              <p className="text-4xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: isTeamATurn && status !== "finished" ? "#FFD700" : "white" }}>
                {scoreA}/{wicketsA}
              </p>
              <p className="text-xs text-gray-600">{squadA.length} players</p>
            </div>
            <div className="text-center px-4">
              <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#222" }}>VS</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs tracking-widest mb-1" style={{ fontFamily: "monospace", color: "#4488FF" }}>TEAM B</p>
              <p className="text-4xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: !isTeamATurn && status !== "finished" ? "#FFD700" : "white" }}>
                {scoreB}/{wicketsB}
              </p>
              <p className="text-xs text-gray-600">{squadB.length} players</p>
            </div>
          </div>
          {winner && (
            <div className="text-center mt-4 py-3 rounded-xl" style={{ background: "#1a1500", border: "1px solid #FFD700" }}>
              <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
                {winner === "draw" ? "🤝 IT'S A TIE!" : `🏆 TEAM ${winner} WINS!`}
              </p>
            </div>
          )}
        </div>

        {/* Speed control */}
        {status !== "finished" && (
          <div className="rounded-xl p-3 mb-4" style={{ background: "#111", border: "1px solid #333" }}>
            <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: "monospace" }}>SIMULATION SPEED</p>
            <div className="flex gap-2">
              {[{ label: "SLOW", val: 1500 }, { label: "NORMAL", val: 800 }, { label: "FAST", val: 300 }, { label: "TURBO", val: 80 }].map(s => (
                <button key={s.val} onClick={() => setSpeed(s.val)}
                  className="flex-1 py-2 rounded-lg text-xs font-black transition"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    background: speed === s.val ? "#FFD700" : "#1a1a1a",
                    color: speed === s.val ? "black" : "white",
                    border: speed === s.val ? "none" : "1px solid #333"
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Commentary */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#111", border: "1px solid #222" }}>
          <p className="text-xs text-gray-600 tracking-widest mb-3" style={{ fontFamily: "monospace" }}>📺 LIVE COMMENTARY</p>
          <div ref={commentaryRef} className="flex flex-col gap-1 max-h-52 overflow-y-auto">
            {commentary.length === 0 && (
              <p className="text-xs text-gray-700" style={{ fontFamily: "monospace" }}>Waiting for match to start...</p>
            )}
            {commentary.map((c) => (
              <p key={c.id} className="text-xs" style={{ color: c.color, fontFamily: "monospace" }}>{c.text}</p>
            ))}
          </div>
        </div>

        {/* Controls */}
        {status === "not_started" && isHost && (
          <button onClick={() => startSim(squadA, squadB)}
            className="w-full py-4 rounded-xl font-black text-xl tracking-widest mb-3"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black", boxShadow: "0 4px 20px #FFD70044" }}>
            START MATCH 🏏
          </button>
        )}
        {status === "not_started" && !isHost && (
          <p className="text-center text-xs live-pulse" style={{ fontFamily: "monospace", color: "#FFD700" }}>● WAITING FOR HOST TO START MATCH...</p>
        )}
        {running && (
          <button onClick={stopSim} className="w-full py-3 rounded-xl font-black tracking-widest mb-3"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "#222", color: "#FF3B3B", border: "1px solid #FF3B3B" }}>
            ⏸ PAUSE
          </button>
        )}
        {!running && status !== "not_started" && status !== "finished" && (
          <button onClick={() => startSim(squadA, squadB)} className="w-full py-3 rounded-xl font-black tracking-widest mb-3"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "#222", color: "#FFD700", border: "1px solid #FFD700" }}>
            ▶ RESUME
          </button>
        )}
        {status === "finished" && (
          <button onClick={() => navigate("/")} className="w-full py-4 rounded-xl font-black text-xl tracking-widest"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black" }}>
            BACK TO HOME 🏠
          </button>
        )}
      </div>
    </div>
  );
}