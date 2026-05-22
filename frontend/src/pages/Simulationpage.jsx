import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import socket from "../services/socket";
import { useSocket } from "../hooks/useSocket";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

const CR = 10_000_000;
const fmt = (n) => n >= CR ? `₹${(n/CR).toFixed(1)}Cr` : `₹${(n||0).toLocaleString("en-IN")}`;

// Seeded random for true randomness
function rand(min = 0, max = 100) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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

const getTeamDetails = (teamKey, currentRoom) => {
  if (!teamKey) return { key: "?", label: "Unknown", emoji: "⏳", color: "#888888" };
  let key = teamKey;
  if (currentRoom && currentRoom.game_mode === "dual_franchise") {
    if (teamKey === "A") key = currentRoom.team_a_name || "CSK";
    if (teamKey === "B") key = currentRoom.team_b_name || "RCB";
  }
  return IPL_TEAMS.find(t => t.key === key) || { key: teamKey, label: `Team ${teamKey}`, emoji: "🏏", color: "#FFD700", secondaryColor: "#FF8C00" };
};

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

  const formBatsman = batsman?.stats?.form_factor || 1.0;
  const formBowler = bowler?.stats?.form_factor || 1.0;

  // Higher SR and Form = more boundaries, lower economy and high Form = more dots/wickets
  const sixChance    = Math.max(3, Math.min(18, (sr - 100) / 8)) * formBatsman;
  const fourChance   = Math.max(8, Math.min(25, (sr - 100) / 5)) * formBatsman;
  const wicketChance = Math.max(3, Math.min(12, (30 - bowlerAvg) / 3)) * formBowler;
  const dotChance    = Math.max(15, Math.min(40, (10 - bowlerEconomy) * 5 + 20)) * formBowler;

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

// Convert overs (like 19.3) to fraction (19.5) for mathematical calculations
function oversToFraction(overs) {
  const whole = Math.floor(overs);
  const balls = Math.round((overs - whole) * 10);
  return whole + balls / 6;
}

// Convert fraction overs back to standard cricket display (19.5 -> 19.3)
function fractionToOvers(fraction) {
  const whole = Math.floor(fraction);
  const balls = Math.round((fraction - whole) * 6);
  if (balls >= 6) return whole + 1;
  return parseFloat(`${whole}.${balls}`);
}

// Fast simulate a match based on squad stats and form factor
function fastSimulateMatch(team1Squad, team2Squad, t1Name, t2Name) {
  const t1Form = (team1Squad || []).reduce((acc, p) => acc + (p.stats?.form_factor || 1.0), 0) / Math.max(1, (team1Squad || []).length);
  const t2Form = (team2Squad || []).reduce((acc, p) => acc + (p.stats?.form_factor || 1.0), 0) / Math.max(1, (team2Squad || []).length);

  const base1 = 160 + (t1Form - t2Form) * 35;
  const base2 = 160 + (t2Form - t1Form) * 35;

  const score1 = Math.round(rand(base1 - 25, base1 + 25));
  const wickets1 = Math.min(10, Math.floor(rand(2, 9 + (t2Form - t1Form) * 2)));

  const wickets2 = Math.min(10, Math.floor(rand(2, 9 + (t1Form - t2Form) * 2)));
  let score2 = 0;
  let winner = null;
  let overs2 = 20;

  if (rand() * t1Form > rand() * t2Form) {
    // Team 1 wins
    score2 = Math.round(rand(base2 - 40, score1 - 5));
    winner = t1Name;
  } else {
    // Team 2 wins
    score2 = score1 + Math.round(rand(1, 4));
    winner = t2Name;
    overs2 = parseFloat((rand(17, 19) + rand(0, 5)/10).toFixed(1));
  }

  return {
    score1, wickets1, overs1: 20,
    score2, wickets2, overs2,
    winner
  };
}

// Deterministic Round Robin Scheduler
function generateRoundRobinSchedule(teams) {
  const list = [...teams].sort(); // Sorted alphabetically to ensure all clients construct exactly identical schedules!
  if (list.length % 2 !== 0) {
    list.push("BYE");
  }
  const rounds = list.length - 1;
  const matchesPerRound = list.length / 2;
  const sched = [];

  for (let r = 0; r < rounds; r++) {
    const roundMatches = [];
    for (let m = 0; m < matchesPerRound; m++) {
      const home = list[(r + m) % (list.length - 1)];
      let away = list[(list.length - 1 - m + r) % (list.length - 1)];
      if (m === 0) {
        away = list[list.length - 1];
      }
      if (home !== "BYE" && away !== "BYE") {
        roundMatches.push({ home, away, id: `R${r+1}-M${m+1}`, status: "pending", result: null });
      }
    }
    sched.push({ roundNum: r + 1, matches: roundMatches });
  }
  return sched;
}

export default function SimulationPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Basic Page details
  const [room, setRoom]           = useState(null);
  const [players, setPlayers]     = useState([]);
  const [allSquads, setAllSquads] = useState({}); // { [teamKey]: Array }
  const [activeTab, setActiveTab] = useState("live");

  // Dual mode/playoffs live score states
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
  const [status, setStatus]       = useState("not_started"); // not_started, innings1, innings2, finished
  const [winner, setWinner]       = useState(null);
  const [running, setRunning]     = useState(false);
  const [speed, setSpeed]         = useState(800);

  // League simulation states
  const [schedule, setSchedule]   = useState([]);
  const [standings, setStandings] = useState([]);
  const [currentRound, setCRound] = useState(1);
  const [leagueState, setLState]   = useState("waiting"); // waiting, league, playoffs, complete
  const [playoffs, setPlayoffs]   = useState({
    q1: { home: "", away: "", result: null, id: "Q1" },
    elim: { home: "", away: "", result: null, id: "ELIM" },
    q2: { home: "", away: "", result: null, id: "Q2" },
    final: { home: "", away: "", result: null, id: "FINAL" },
  });
  const [activePlayoffKey, setActivePlayoffKey] = useState(null); // 'q1', 'elim', 'q2', 'final'

  const intervalRef    = useRef(null);
  const commentaryRef  = useRef(null);
  const stateRef       = useRef({});
  const speedRef       = useRef(800);

  const TOTAL_OVERS = 20;

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const fetchAll = async () => {
    try {
      const roomRes = await API.get(`/fantasy/${code}`);
      const currentRoom = roomRes.data.room;
      setRoom(currentRoom);

      const playersRes = await API.get(`/fantasy/${code}/players`);
      setPlayers(playersRes.data.players);

      const teamsList = [];
      if (currentRoom.game_mode === "dual_franchise") {
        teamsList.push("A", "B");
        setActiveTab("live");
      } else {
        playersRes.data.players.forEach(p => {
          if (p.selected_team && !teamsList.includes(p.selected_team)) {
            teamsList.push(p.selected_team);
          }
        });
        setActiveTab("standings");
      }

      // Load all squads
      const squadsMap = {};
      await Promise.all(
        teamsList.map(async (t) => {
          const res = await API.get(`/fantasy/${code}/squad/${t}`);
          squadsMap[t] = res.data.squad;
        })
      );
      setAllSquads(squadsMap);

      if (currentRoom.game_mode === "dual_franchise") {
        setSquadA(squadsMap["A"] || []);
        setSquadB(squadsMap["B"] || []);
      } else {
        // Initialize Standing Table & deterministically schedule matches
        const initialSt = teamsList.map(t => ({
          team: t, played: 0, won: 0, lost: 0, points: 0,
          runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0, nrr: 0
        }));
        setStandings(initialSt);
        
        const generatedSched = generateRoundRobinSchedule(teamsList);
        setSchedule(generatedSched);
        setLState("league");
      }
    } catch (err) {
      console.error("Error setting up simulation room:", err);
    }
  };

  useEffect(() => {
    fetchAll();
    socket.emit("join_fantasy_room", { roomCode: code });
  }, [code]);

  useEffect(() => {
    if (commentaryRef.current) commentaryRef.current.scrollTop = commentaryRef.current.scrollHeight;
  }, [commentary]);

  const addComm = (text, color = "#ccc") => {
    setComm(prev => [...prev.slice(-80), { text, color, id: Math.random() }]);
  };

  // ─── Socket listeners (Guest Sync Engine) ──────────────────────
  useSocket("sim_started", (data) => {
    setStatus(data.status);
    setComm([]);
    addComm(data.message, "#FFD700");
    setScoreA(0); setScoreB(0); setWicketsA(0); setWicketsB(0);
    setOver(0); setBall(0); setIsTeamA(true); setWinner(null);
    if (data.activePlayoffKey) {
      setActivePlayoffKey(data.activePlayoffKey);
      setActiveTab("live");
    }
  });

  useSocket("sim_ball_played", (data) => {
    setScoreA(data.scoreA);
    setScoreB(data.scoreB);
    setWicketsA(data.wicketsA);
    setWicketsB(data.wicketsB);
    setOver(data.over);
    setBall(data.ball);
    setIsTeamA(data.isTeamATurn);
    setStatus(data.status);
    addComm(data.commentaryLine, data.lineColor);
  });

  useSocket("sim_match_result", (data) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setStatus("finished");
    setWinner(data.winner);
    addComm(data.commEndLine, "#FFD700");

    if (data.isPlayoff) {
      // Update playoff bracket
      setPlayoffs(prev => {
        const next = { ...prev };
        next[data.playoffKey] = {
          ...next[data.playoffKey],
          result: {
            scoreA: data.scoreA, scoreB: data.scoreB,
            wicketsA: data.wicketsA, wicketsB: data.wicketsB,
            winnerName: data.winnerName
          }
        };
        return next;
      });
    }
  });

  useSocket("sim_status_changed", (data) => {
    if (data.status) setLState(data.status);
    if (data.standings) setStandings(data.standings);
    if (data.schedule) setSchedule(data.schedule);
    if (data.currentRound) setCRound(data.currentRound);
    if (data.playoffs) setPlayoffs(data.playoffs);
    if (data.activePlayoffKey !== undefined) setActivePlayoffKey(data.activePlayoffKey);
    if (data.activeTab) setActiveTab(data.activeTab);
  });

  const stopSim = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    socket.emit("sim_status_change", { roomCode: code, activePlayoffKey: null });
  };

  const isHost = room?.host_id === user?.id;

  // Fallback squad builder for protection
  const getSquadFallback = (teamKey) => {
    const sq = allSquads[teamKey] || [];
    if (sq.length > 0) return sq;
    return [
      { player_name: "T20 Heavy Hitter", stats: { sr: 155, economy: 7.8, avg: 38, form_factor: 1.2 } },
      { player_name: "Classic Anchorman", stats: { sr: 135, economy: 8.2, avg: 31, form_factor: 1.0 } },
      { player_name: "Dynamic Wicketkeeper", stats: { sr: 140, economy: 8.5, avg: 26, form_factor: 0.95 } },
      { player_name: "Premier Pace Bowler", stats: { sr: 110, economy: 6.7, avg: 21, form_factor: 1.25 } },
      { player_name: "Mystery Spinner", stats: { sr: 120, economy: 7.1, avg: 23, form_factor: 1.15 } }
    ];
  };

  // Run ball-by-ball simulated loop on host side
  const startSim = (squadARef, squadBRef, isPlayoff = false, playoffKey = null) => {
    if (running) return;
    setRunning(true);
    setStatus("innings1");
    setComm([]);

    const tAName = isPlayoff ? playoffs[playoffKey].home : (room?.team_a_name || "Team A");
    const tBName = isPlayoff ? playoffs[playoffKey].away : (room?.team_b_name || "Team B");

    socket.emit("sim_start", {
      roomCode: code,
      status: "innings1",
      message: `🏏 MATCH BEGINS! ${tAName} batting first against ${tBName}.`,
      activePlayoffKey: playoffKey
    });

    const state = {
      scoreA: 0, scoreB: 0,
      wicketsA: 0, wicketsB: 0,
      over: 0, ball: 0,
      teamATurn: true, innings1Done: false,
      sA: squadARef.length ? squadARef : getSquadFallback(isPlayoff ? playoffs[playoffKey].home : "A"),
      sB: squadBRef.length ? squadBRef : getSquadFallback(isPlayoff ? playoffs[playoffKey].away : "B"),
    };
    stateRef.current = state;

    intervalRef.current = setInterval(() => {
      const s = stateRef.current;
      const batting = s.teamATurn ? s.sA : s.sB;
      const bowling = s.teamATurn ? s.sB : s.sA;

      const batsmanIdx = Math.min(s.teamATurn ? s.wicketsA : s.wicketsB, batting.length - 1);
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

      if (result.event !== "wide" && result.event !== "noball") {
        s.ball++;
        if (s.ball >= 6) { s.ball = 0; s.over++; }
      }
      setBall(s.ball); setOver(s.over);
      setIsTeamA(s.teamATurn);

      const overStr = `${s.over}.${s.ball}`;
      const bName = batsman?.player_name?.split(" ").pop() || "Bat";
      const bowlName = bowler?.player_name?.split(" ").pop() || "Bowl";
      const commText = `[${overStr}] ${bName} vs ${bowlName} — ${result.commentary}`;
      const commColor = result.event === "wicket" ? "#FF3B3B" : result.event === "six" ? "#FFD700" : result.event === "four" ? "#00FF88" : "#ccc";

      // Broadcast single ball outcome to guests
      socket.emit("sim_ball", {
        roomCode: code,
        scoreA: s.scoreA, scoreB: s.scoreB,
        wicketsA: s.wicketsA, wicketsB: s.wicketsB,
        over: s.over, ball: s.ball,
        isTeamATurn: s.teamATurn,
        status: s.teamATurn ? "innings1" : "innings2",
        commentaryLine: commText,
        lineColor: commColor
      });

      const maxWicketsA = Math.max(1, s.sA.length);
      const maxWicketsB = Math.max(1, s.sB.length);
      const allOut = s.teamATurn ? s.wicketsA >= maxWicketsA : s.wicketsB >= maxWicketsB;
      const oversUp = s.over >= TOTAL_OVERS;

      // Chase complete
      if (!s.teamATurn && s.scoreB > s.scoreA) {
        const remaining = (TOTAL_OVERS - s.over) * 6 - s.ball;
        const commEnd = `🎉 ${tBName} wins with ${remaining} balls to spare!`;
        socket.emit("sim_match_end", {
          roomCode: code, winner: "B", commEndLine: commEnd,
          isPlayoff, playoffKey, winnerName: tBName,
          scoreA: s.scoreA, scoreB: s.scoreB,
          wicketsA: s.wicketsA, wicketsB: s.wicketsB
        });
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
          socket.emit("sim_ball", {
            roomCode: code, scoreA: s.scoreA, scoreB: s.scoreB,
            wicketsA: s.wicketsA, wicketsB: s.wicketsB, over: 0, ball: 0,
            isTeamATurn: false, status: "innings2",
            commentaryLine: `--- INNINGS BREAK --- ${tAName}: ${s.scoreA}/${s.wicketsA} in 20.0 overs. ${tBName} needs ${s.scoreA + 1} runs to win.`,
            lineColor: "#FFD700"
          });
        } else {
          // Finished
          let winSide = "draw";
          let endLine = "🤝 IT'S A TIE! Incredible match!";
          if (s.scoreA > s.scoreB) {
            winSide = "A";
            endLine = `🏆 ${tAName} WINS by ${s.scoreA - s.scoreB} runs!`;
          } else if (s.scoreB > s.scoreA) {
            winSide = "B";
            endLine = `🏆 ${tBName} WINS by ${s.scoreB - s.scoreA} runs!`;
          }
          socket.emit("sim_match_end", {
            roomCode: code, winner: winSide, commEndLine: endLine,
            isPlayoff, playoffKey, winnerName: winSide === "A" ? tAName : (winSide === "B" ? tBName : "TIE"),
            scoreA: s.scoreA, scoreB: s.scoreB,
            wicketsA: s.wicketsA, wicketsB: s.wicketsB
          });
        }
      }
    }, speedRef.current);
  };

  // ─── LEAGUE FAST SIMULATION ──────────────────────────────
  const handleSimRound = () => {
    if (!isHost || leagueState !== "league") return;

    const roundIndex = currentRound - 1;
    if (roundIndex >= schedule.length) return;

    const currentMatches = schedule[roundIndex].matches;
    const updatedMatches = currentMatches.map(m => {
      const hSquad = allSquads[m.home] || [];
      const aSquad = allSquads[m.away] || [];
      const outcome = fastSimulateMatch(hSquad, aSquad, m.home, m.away);

      return {
        ...m,
        status: "simulated",
        result: outcome
      };
    });

    const newSched = [...schedule];
    newSched[roundIndex].matches = updatedMatches;

    // Recalculate Standings table
    const standsMap = {};
    standings.forEach(s => {
      standsMap[s.team] = { ...s };
    });

    updatedMatches.forEach(m => {
      const res = m.result;
      const tHome = standsMap[m.home];
      const tAway = standsMap[m.away];

      tHome.played += 1;
      tAway.played += 1;

      // Mathematical NRR tracking
      tHome.runsScored += res.score1;
      tHome.oversFaced += 20; // 1st innings complete
      tHome.runsConceded += res.score2;
      tHome.oversBowled += oversToFraction(res.overs2);

      tAway.runsScored += res.score2;
      tAway.oversFaced += oversToFraction(res.overs2);
      tAway.runsConceded += res.score1;
      tAway.oversBowled += 20;

      if (res.winner === m.home) {
        tHome.won += 1;
        tHome.points += 2;
        tAway.lost += 1;
      } else if (res.winner === m.away) {
        tAway.won += 1;
        tAway.points += 2;
        tHome.lost += 1;
      } else {
        tHome.points += 1;
        tAway.points += 1;
      }
    });

    // Recompute Net Run Rate
    const newSt = Object.values(standsMap).map(st => {
      const oFaced = st.oversFaced;
      const oBowled = st.oversBowled;
      let runRate = 0;
      if (oFaced > 0 && oBowled > 0) {
        runRate = (st.runsScored / oFaced) - (st.runsConceded / oBowled);
      }
      return {
        ...st,
        nrr: parseFloat(runRate.toFixed(3))
      };
    });

    // Sort by Points (desc) then NRR (desc)
    newSt.sort((a, b) => b.points - a.points || b.nrr - a.nrr);

    const nextRound = currentRound + 1;
    let nextLState = "league";

    // Check if season is complete
    if (nextRound > schedule.length) {
      nextLState = "playoffs";
      // Initialize Playoffs with Top 4 teams!
      const top4 = newSt.slice(0, 4).map(s => s.team);
      const isPlayoffReady = top4.length >= 4;

      const top1 = top4[0] || "T1";
      const top2 = top4[1] || "T2";
      const top3 = top4[2] || "T3";
      const top4team = top4[3] || "T4";

      const pl = {
        q1: { home: top1, away: top2, result: null, id: "Q1" },
        elim: { home: top3, away: top4team, result: null, id: "ELIM" },
        q2: { home: "", away: "", result: null, id: "Q2" },
        final: { home: "", away: "", result: null, id: "FINAL" },
      };
      
      socket.emit("sim_status_change", {
        roomCode: code,
        status: nextLState,
        standings: newSt,
        schedule: newSched,
        currentRound: nextRound,
        playoffs: pl
      });
    } else {
      socket.emit("sim_status_change", {
        roomCode: code,
        status: nextLState,
        standings: newSt,
        schedule: newSched,
        currentRound: nextRound
      });
    }
  };

  const handleStartPlayoffMatch = (playoffKey) => {
    if (!isHost) return;
    const match = playoffs[playoffKey];
    if (!match.home || !match.away) return;

    setActivePlayoffKey(playoffKey);
    setComm([]);
    setStatus("not_started");
    setScoreA(0); setScoreB(0); setWicketsA(0); setWicketsB(0);
    setOver(0); setBall(0);

    const sA = allSquads[match.home] || [];
    const sB = allSquads[match.away] || [];
    setSquadA(sA);
    setSquadB(sB);

    setActiveTab("live");
    startSim(sA, sB, true, playoffKey);
  };

  const advancePlayoffs = () => {
    if (!isHost || leagueState !== "playoffs") return;

    // Check Qualifier 1 and Eliminator outcomes to set up Qualifier 2
    if (playoffs.q1.result && playoffs.elim.result && !playoffs.q2.home) {
      const q1Winner = playoffs.q1.result.winnerName;
      const q1Loser = q1Winner === playoffs.q1.home ? playoffs.q1.away : playoffs.q1.home;
      const elimWinner = playoffs.elim.result.winnerName;

      setPlayoffs(prev => {
        const next = {
          ...prev,
          q2: { ...prev.q2, home: q1Loser, away: elimWinner }
        };
        socket.emit("sim_status_change", { roomCode: code, playoffs: next });
        return next;
      });
      return;
    }

    // Check Qualifier 2 to set up Final
    if (playoffs.q1.result && playoffs.q2.result && !playoffs.final.home) {
      const q1Winner = playoffs.q1.result.winnerName;
      const q2Winner = playoffs.q2.result.winnerName;

      setPlayoffs(prev => {
        const next = {
          ...prev,
          final: { ...prev.final, home: q1Winner, away: q2Winner }
        };
        socket.emit("sim_status_change", { roomCode: code, playoffs: next });
        return next;
      });
      return;
    }

    // Complete the season
    if (playoffs.final.result) {
      setLState("complete");
      socket.emit("sim_status_change", { roomCode: code, status: "complete" });
    }
  };

  const getFranchiseTheme = () => {
    let activeKey = null;
    if (room?.game_mode === "dual_franchise") {
      activeKey = isTeamATurn ? (room.team_a_name || "CSK") : (room.team_b_name || "RCB");
    } else if (activePlayoffKey) {
      const pm = playoffs[activePlayoffKey];
      activeKey = isTeamATurn ? pm.home : pm.away;
    }
    const details = IPL_TEAMS.find(t => t.key === activeKey);
    return details || { color: "#FFD700", secondaryColor: "#FF8C00" };
  };

  const theme = getFranchiseTheme();

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col" style={BG}>
      
      {/* CONFETTI OVERLAY ON COMPLETE */}
      {leagueState === "complete" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-center p-6">
          <div className="absolute inset-0 bg-gradient-to-t from-[#FFD700]/10 via-transparent to-transparent pointer-events-none" />
          <p className="text-8xl animate-bounce mb-4">🏆</p>
          <h1 className="text-6xl font-black mb-2 tracking-wider text-[#FFD700]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            SEASON CHAMPIONS
          </h1>
          <p className="text-4xl font-extrabold mb-6" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#00FF88" }}>
            {playoffs.final.result?.winnerName || "UNKNOWN"} 👑
          </p>
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#111] p-6 text-sm text-gray-400 font-mono shadow-2xl">
            <p className="font-extrabold text-white text-base mb-3 border-b border-white/5 pb-2">🏆 MATCH RECAP (GRAND FINALS)</p>
            <p className="mb-1 text-left flex justify-between">
              <span>{playoffs.final.home}</span>
              <span className="text-white font-bold">{playoffs.final.result?.scoreA}/{playoffs.final.result?.wicketsA}</span>
            </p>
            <p className="mb-4 text-left flex justify-between">
              <span>{playoffs.final.away}</span>
              <span className="text-white font-bold">{playoffs.final.result?.scoreB}/{playoffs.final.result?.wicketsB}</span>
            </p>
            <p className="text-[#FFD700] text-center font-bold">Crowned Champions of ChanBet IPL League!</p>
          </div>
          <button onClick={() => navigate("/")} className="mt-8 px-8 py-3 rounded-xl font-black text-black bg-gradient-to-r from-[#FFD700] to-[#FF8C00] tracking-widest uppercase transition-all duration-300 hover:scale-105">
            BACK TO LOBBY 🏠
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#111]/80 backdrop-blur-md border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-500" style={{ background: theme.color }} />
        <div>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-0.5" style={{ fontFamily: "monospace" }}>ROOM {code}</p>
          <p className="font-black text-2xl tracking-wider uppercase text-[#FFD700] flex items-center gap-1.5" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            <span>🏟️ SIMULATION CENTER</span>
          </p>
        </div>

        {/* Dynamic Mode specific widgets */}
        {room?.game_mode === "multiplayer_league" ? (
          <div className="flex bg-white/5 border border-white/10 p-0.5 rounded-xl">
            {["standings", "fixtures", "live"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  background: activeTab === tab ? "linear-gradient(135deg, #FFD700, #FF8C00)" : "transparent",
                  color: activeTab === tab ? "black" : "#aaa"
                }}>
                {tab === "live" ? "📺 LIVE MATCH" : tab}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-right font-mono">
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">OVERS</p>
            <p className="font-extrabold text-white text-sm">{over}.{ball} / {TOTAL_OVERS}</p>
          </div>
        )}

        <div className="text-right">
          <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mb-0.5" style={{ fontFamily: "monospace" }}>STATUS</p>
          <span className="text-xs font-extrabold text-white px-3 py-1 rounded-full uppercase tracking-wider font-mono border"
            style={{
              borderColor: `${theme.color}44`,
              background: `${theme.color}15`,
              color: theme.color
            }}>
            {room?.game_mode === "dual_franchise" 
              ? (status === "not_started" ? "READY" : status === "finished" ? "FINISHED" : "LIVE 🔴")
              : `LEAGUE ROUND ${currentRound}`}
          </span>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">

        {/* =============================================
           TAB PANEL: STANDINGS (League mode only)
           ============================================= */}
        {room?.game_mode === "multiplayer_league" && activeTab === "standings" && (
          <div className="rounded-3xl border border-white/5 bg-[#111] p-5 flex flex-col gap-5 shadow-2xl fade-in">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="font-black text-2xl uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>POINTS STANDINGS</h3>
                <p className="text-xs text-gray-500 font-semibold uppercase font-mono leading-none mt-1">Leaderboard updates automatically each simulated round.</p>
              </div>
              {isHost && leagueState === "league" && (
                <button onClick={handleSimRound}
                  className="px-6 py-2.5 rounded-xl font-black text-black bg-gradient-to-r from-[#FFD700] to-[#FF8C00] shadow-md hover:opacity-95 transition"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  SIMULATE ROUND {currentRound} ⚡
                </button>
              )}
              {isHost && leagueState === "playoffs" && (
                <button onClick={advancePlayoffs}
                  className="px-6 py-2.5 rounded-xl font-black text-black bg-gradient-to-r from-[#00FF88] to-[#009955] shadow-md hover:opacity-95 transition animate-pulse"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  RESOLVE PLAYOFF BRACKET 🏆
                </button>
              )}
              {!isHost && (
                <p className="text-xs text-[#FFD700] font-bold tracking-widest uppercase live-pulse" style={{ fontFamily: "monospace" }}>
                  ● Waiting for Host to advance...
                </p>
              )}
            </div>

            {/* Standings Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5 pb-2 text-[10px] tracking-widest uppercase">
                    <th className="py-2.5 px-3">POS</th>
                    <th className="py-2.5 px-3">TEAM</th>
                    <th className="py-2.5 px-3 text-center">P</th>
                    <th className="py-2.5 px-3 text-center">W</th>
                    <th className="py-2.5 px-3 text-center">L</th>
                    <th className="py-2.5 px-3 text-center font-bold text-[#FFD700]">PTS</th>
                    <th className="py-2.5 px-3 text-right">NRR</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((st, i) => {
                    const details = getTeamDetails(st.team);
                    const isMyTeam = players.find(p => p.user_id === user.id)?.selected_team === st.team;
                    const inPlayoffs = i < 4;

                    return (
                      <tr key={st.team} className="transition-all duration-300 border-b border-white/5 hover:bg-white/5"
                        style={{
                          background: isMyTeam ? `${details.color}11` : "transparent",
                        }}>
                        <td className="py-3 px-3 font-bold flex items-center gap-1">
                          {i === 0 ? "👑" : i + 1}
                          {inPlayoffs && <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1 py-0.2 rounded font-extrabold uppercase ml-1">Q</span>}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-sm" style={{ color: details.color }}>
                          <span className="flex items-center gap-2">
                            <span>{details.emoji}</span>
                            <span>{details.label}</span>
                            {isMyTeam && <span className="text-[9px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 px-1.5 py-0.5 rounded-full font-black uppercase">YOURS</span>}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-gray-300">{st.played}</td>
                        <td className="py-3 px-3 text-center text-green-400 font-bold">{st.won}</td>
                        <td className="py-3 px-3 text-center text-red-400 font-bold">{st.lost}</td>
                        <td className="py-3 px-3 text-center font-black text-sm text-[#FFD700]">{st.points}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-gray-200">{st.nrr > 0 ? `+${st.nrr.toFixed(3)}` : st.nrr.toFixed(3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Playoffs Bracket View */}
            {leagueState !== "waiting" && (
              <div className="mt-6 border-t border-white/5 pt-6">
                <h4 className="font-black text-xl uppercase tracking-wider mb-4 text-[#FFD700]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>⚡ T20 PLAYOFF BRACKET</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* QUALIFIER 1 */}
                  <div className={`p-4 rounded-2xl bg-[#080808] border transition ${playoffs.q1.result ? "border-green-500/20" : "border-white/5"}`}>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest font-mono mb-2">QUALIFIER 1</p>
                    <div className="flex flex-col gap-1">
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>🦁 {playoffs.q1.home || "Rank 1"}</span>
                        <span className="text-[#FFD700]">{playoffs.q1.result?.scoreA || "-"}</span>
                      </p>
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>👑 {playoffs.q1.away || "Rank 2"}</span>
                        <span className="text-[#FFD700]">{playoffs.q1.result?.scoreB || "-"}</span>
                      </p>
                    </div>
                    {isHost && !playoffs.q1.result && playoffs.q1.home && (
                      <button onClick={() => handleStartPlayoffMatch("q1")} className="w-full mt-3 py-1.5 rounded-lg text-xs font-black text-black bg-[#FFD700] hover:opacity-90 transition">PLAY MATCH</button>
                    )}
                  </div>

                  {/* ELIMINATOR */}
                  <div className={`p-4 rounded-2xl bg-[#080808] border transition ${playoffs.elim.result ? "border-green-500/20" : "border-white/5"}`}>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest font-mono mb-2">ELIMINATOR</p>
                    <div className="flex flex-col gap-1">
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>🧿 {playoffs.elim.home || "Rank 3"}</span>
                        <span className="text-[#FFD700]">{playoffs.elim.result?.scoreA || "-"}</span>
                      </p>
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>🦅 {playoffs.elim.away || "Rank 4"}</span>
                        <span className="text-[#FFD700]">{playoffs.elim.result?.scoreB || "-"}</span>
                      </p>
                    </div>
                    {isHost && !playoffs.elim.result && playoffs.elim.home && (
                      <button onClick={() => handleStartPlayoffMatch("elim")} className="w-full mt-3 py-1.5 rounded-lg text-xs font-black text-black bg-[#FFD700] hover:opacity-90 transition">PLAY MATCH</button>
                    )}
                  </div>

                  {/* QUALIFIER 2 */}
                  <div className={`p-4 rounded-2xl bg-[#080808] border transition ${playoffs.q2.result ? "border-green-500/20" : "border-white/5"}`}>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest font-mono mb-2">QUALIFIER 2</p>
                    <div className="flex flex-col gap-1">
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>⚔️ {playoffs.q2.home || "Loser Q1"}</span>
                        <span className="text-[#FFD700]">{playoffs.q2.result?.scoreA || "-"}</span>
                      </p>
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>🏰 {playoffs.q2.away || "Winner Elim"}</span>
                        <span className="text-[#FFD700]">{playoffs.q2.result?.scoreB || "-"}</span>
                      </p>
                    </div>
                    {isHost && !playoffs.q2.result && playoffs.q2.home && (
                      <button onClick={() => handleStartPlayoffMatch("q2")} className="w-full mt-3 py-1.5 rounded-lg text-xs font-black text-black bg-[#FFD700] hover:opacity-90 transition">PLAY MATCH</button>
                    )}
                  </div>

                  {/* GRAND FINALS */}
                  <div className={`p-4 rounded-2xl bg-[#080808] border transition ${playoffs.final.result ? "border-green-500/20" : "border-white/5"}`}>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest font-mono mb-2">GRAND FINALS</p>
                    <div className="flex flex-col gap-1">
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>👑 {playoffs.final.home || "Winner Q1"}</span>
                        <span className="text-[#FFD700]">{playoffs.final.result?.scoreA || "-"}</span>
                      </p>
                      <p className="font-extrabold text-xs flex justify-between">
                        <span>⚔️ {playoffs.final.away || "Winner Q2"}</span>
                        <span className="text-[#FFD700]">{playoffs.final.result?.scoreB || "-"}</span>
                      </p>
                    </div>
                    {isHost && !playoffs.final.result && playoffs.final.home && (
                      <button onClick={() => handleStartPlayoffMatch("final")} className="w-full mt-3 py-1.5 rounded-lg text-xs font-black text-black bg-gradient-to-r from-[#FFD700] to-[#FF8C00] hover:opacity-90 transition">PLAY FINALS</button>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* =============================================
           TAB PANEL: FIXTURES & RESULTS (League mode)
           ============================================= */}
        {room?.game_mode === "multiplayer_league" && activeTab === "fixtures" && (
          <div className="rounded-3xl border border-white/5 bg-[#111] p-5 flex flex-col gap-4 shadow-2xl fade-in">
            <div>
              <h3 className="font-black text-2xl uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>FIXTURES & SEASON RESULTS</h3>
              <p className="text-xs text-gray-500 font-semibold uppercase font-mono mt-0.5">Full round-robin match fixtures scheduled deterministically.</p>
            </div>

            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-2">
              {schedule.map((round) => (
                <div key={round.roundNum} className="border-b border-white/5 pb-4 last:border-0">
                  <p className="text-xs text-gray-500 font-black tracking-widest font-mono mb-2">ROUND {round.roundNum}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {round.matches.map((m) => {
                      const detailsH = getTeamDetails(m.home);
                      const detailsA = getTeamDetails(m.away);
                      const active = m.status === "simulated";

                      return (
                        <div key={m.id} className="p-3.5 rounded-2xl bg-black border border-white/5 flex items-center justify-between text-xs font-mono">
                          <span className="font-bold flex items-center gap-1.5">
                            <span style={{ color: detailsH.color }}>{detailsH.emoji} {detailsH.key}</span>
                            <span className="text-gray-600 font-normal">vs</span>
                            <span style={{ color: detailsA.color }}>{detailsA.emoji} {detailsA.key}</span>
                          </span>

                          {active ? (
                            <span className="text-right">
                              <p className="font-black text-[#FFD700] text-sm">
                                {m.result.score1}/{m.result.wickets1} - {m.result.score2}/{m.result.wickets2}
                              </p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                                {m.result.winner} won
                              </p>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-[#FFD700] border border-[#FFD700]/10 uppercase">
                              UPCOMING
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =============================================
           TAB PANEL: LIVE MATCH SIMULATION
           ============================================= */}
        {activeTab === "live" && (
          <div className="flex flex-col gap-6 fade-in">
            {/* Scoreboard */}
            <div className="rounded-3xl p-6 border bg-[#111] shadow-2xl relative overflow-hidden transition-all duration-300"
              style={{ borderColor: theme.color }}>
              
              {/* Backlight glow */}
              <div className="absolute inset-0 opacity-5 pointer-events-none transition-all duration-1000"
                style={{ background: `radial-gradient(circle at 50% 50%, ${theme.color}, transparent 60%)` }} />

              <div className="flex items-center justify-between relative z-10">
                
                {/* Team A */}
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1" style={{ fontFamily: "monospace" }}>
                    {activePlayoffKey ? playoffs[activePlayoffKey].home : (room?.team_a_name || "Team A")}
                  </p>
                  <p className="text-5xl font-black transition-all duration-300" 
                    style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      color: isTeamATurn && status !== "finished" && status !== "not_started" ? theme.color : "white"
                    }}>
                    {scoreA}/{wicketsA}
                  </p>
                  <p className="text-[10px] text-gray-600 font-bold font-mono mt-1">{squadA.length} superstars</p>
                </div>

                <div className="text-center px-6">
                  <span className="text-xs font-black tracking-widest text-gray-600 block mb-1">VS</span>
                  <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center font-bold text-sm text-[#FFD700] shadow-inner">🏆</div>
                </div>

                {/* Team B */}
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1" style={{ fontFamily: "monospace" }}>
                    {activePlayoffKey ? playoffs[activePlayoffKey].away : (room?.team_b_name || "Team B")}
                  </p>
                  <p className="text-5xl font-black transition-all duration-300" 
                    style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      color: !isTeamATurn && status !== "finished" && status !== "not_started" ? theme.color : "white"
                    }}>
                    {scoreB}/{wicketsB}
                  </p>
                  <p className="text-[10px] text-gray-600 font-bold font-mono mt-1">{squadB.length} superstars</p>
                </div>

              </div>

              {/* Match outcome banner */}
              {status === "finished" && (
                <div className="text-center mt-6 py-3.5 rounded-2xl relative overflow-hidden border transition-all duration-500"
                  style={{
                    background: `${theme.color}15`,
                    borderColor: `${theme.color}55`,
                    boxShadow: `0 0 15px ${theme.color}22`
                  }}>
                  <p className="text-2xl font-black uppercase tracking-wider" 
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: theme.color }}>
                    {winner === "draw" ? "🤝 IT'S A TIE!" : `🏆 ${winnerNameFromKey(winner)} WINS THE MATCH!`}
                  </p>
                </div>
              )}
            </div>

            {/* Speed & Sim Controls Panel */}
            {status !== "finished" && (
              <div className="rounded-2xl p-4 bg-[#111] border border-white/5">
                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-2.5" style={{ fontFamily: "monospace" }}>SIMULATION TICKER SPEED</p>
                <div className="flex gap-2.5">
                  {[
                    { label: "🧘 SLOW", val: 1500 },
                    { label: "🏃 NORMAL", val: 800 },
                    { label: "⚡ FAST", val: 300 },
                    { label: "🔥 TURBO", val: 80 }
                  ].map(s => (
                    <button key={s.val} onClick={() => setSpeed(s.val)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-300"
                      style={{
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        background: speed === s.val ? "linear-gradient(135deg, #FFD700, #FF8C00)" : "#1a1a1a",
                        color: speed === s.val ? "black" : "white",
                        border: speed === s.val ? "none" : "1px solid #333"
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live commentary log */}
            <div className="rounded-3xl p-5 bg-[#111] border border-white/5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase" style={{ fontFamily: "monospace" }}>📺 LIVE STADIUM COMMENTARY</span>
                <span className="text-xs font-bold text-[#FFD700] tracking-wider font-mono uppercase live-pulse">● FEED ONLINE</span>
              </div>

              <div ref={commentaryRef} className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {commentary.length === 0 && (
                  <p className="text-xs text-gray-700 font-bold py-6 text-center" style={{ fontFamily: "monospace" }}>Stadium gates open. Waiting for batsman to take strike...</p>
                )}
                {commentary.map((c) => (
                  <div key={c.id} className="text-xs px-3 py-1.5 rounded-xl bg-black border border-white/5 flex items-start gap-2 shadow-inner" style={{ fontFamily: "monospace" }}>
                    <span style={{ color: c.color }}>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Match trigger admin controls */}
            <div className="flex flex-col gap-3">
              {status === "not_started" && isHost && (
                <button onClick={() => startSim(squadA, squadB, !!activePlayoffKey, activePlayoffKey)}
                  className="w-full py-4.5 rounded-2xl font-black text-2xl tracking-widest uppercase text-black bg-gradient-to-r from-[#FFD700] to-[#FF8C00] shadow-xl hover:scale-102 transition"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  START MATCH 🏏
                </button>
              )}
              {status === "not_started" && !isHost && (
                <p className="text-center text-xs font-bold tracking-widest uppercase text-[#FFD700] live-pulse" style={{ fontFamily: "monospace" }}>● Waiting for Host to bowl first ball...</p>
              )}

              {running && (
                <button onClick={stopSim} className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase text-[#FF3B3B] bg-[#1a0a0a] border border-[#FF3B3B]/30 hover:bg-[#FF3B3B]/10 transition-all duration-300"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  ⏸ PAUSE SIMULATOR
                </button>
              )}

              {!running && status !== "not_started" && status !== "finished" && isHost && (
                <button onClick={() => startSim(squadA, squadB, !!activePlayoffKey, activePlayoffKey)} className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase text-[#00FF88] bg-[#0a1a0a] border border-[#00FF88]/30 hover:bg-[#00FF88]/10 transition-all duration-300"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  ▶ RESUME SIMULATOR
                </button>
              )}

              {status === "finished" && room?.game_mode === "multiplayer_league" && isHost && (
                <button onClick={() => {
                  setStatus("not_started");
                  setCRound(prev => prev);
                  // Return back to standings
                  setActiveTab("standings");
                  advancePlayoffs();
                }} className="w-full py-4 rounded-2xl font-black text-xl tracking-widest uppercase text-black bg-gradient-to-r from-[#00FF88] to-[#009955] transition"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  RETURN & UPDATE BRACKET 🏆
                </button>
              )}

              {status === "finished" && room?.game_mode === "dual_franchise" && (
                <button onClick={() => navigate("/")} className="w-full py-4.5 rounded-2xl font-black text-xl tracking-widest uppercase text-black bg-gradient-to-r from-[#FFD700] to-[#FF8C00] transition"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  RETURN TO HOME 🏠
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );

  function winnerNameFromKey(wKey) {
    if (room?.game_mode === "dual_franchise") {
      return wKey === "A" ? (room.team_a_name || "Team A") : (room.team_b_name || "Team B");
    }
    if (activePlayoffKey) {
      const pm = playoffs[activePlayoffKey];
      return wKey === "A" ? pm.home : pm.away;
    }
    return wKey;
  }
}