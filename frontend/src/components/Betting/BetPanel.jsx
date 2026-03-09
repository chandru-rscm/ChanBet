import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import socket from "../../services/socket";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function BetPanel({ match, roomCode, onBetPlaced }) {
  const { user, login } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [betPlaced, setBetPlaced] = useState(false);

  const teamA = match?.team_a || "Team A";
  const teamB = match?.team_b || "Team B";
  const balance = user?.coins || 0;

  const handlePlaceBet = async () => {
    if (!selectedTeam) return alert("Pick a team first!");
    if (!amount || Number(amount) <= 0) return alert("Enter a valid amount!");
    if (Number(amount) > balance) return alert("Not enough ₹! 😅");

    setLoading(true);
    try {
      const res = await API.post("/bets/place", {
        userId: user.id,
        roomCode,
        matchId: match.match_id,
        betOn: selectedTeam,
        amount: Number(amount),
      });

      // Update local user coins
      login({ ...user, coins: balance - Number(amount) });

      // Notify everyone in room
      socket.emit("place_bet", {
        roomCode,
        userName: user.name,
        avatar: user.avatar,
        betOn: selectedTeam,
        amount: Number(amount),
      });

      setBetPlaced(true);
      if (onBetPlaced) onBetPlaced(res.data.bet);
    } catch (err) {
      alert("Failed to place bet, try again!");
    } finally {
      setLoading(false);
    }
  };

  if (betPlaced) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center border border-yellow-400">
        <p className="text-5xl mb-3">🎲</p>
        <h3 className="text-xl font-bold text-yellow-400">Bet Placed!</h3>
        <p className="text-gray-300 mt-2">
          ₹{Number(amount).toLocaleString("en-IN")} on{" "}
          <span className="text-white font-bold">{selectedTeam}</span>
        </p>
        <p className="text-gray-500 text-sm mt-3 animate-pulse">
          Waiting for match to end...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-lg font-bold text-yellow-400 text-center">🎲 Place Your Bet</h3>

      {/* Balance */}
      <div className="bg-gray-900 rounded-xl p-3 text-center">
        <p className="text-gray-400 text-xs">Your Balance</p>
        <p className="text-2xl font-bold text-green-400">
          ₹{balance.toLocaleString("en-IN")}
        </p>
      </div>

      {/* Team Picker */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSelectedTeam(teamA)}
          className={`py-4 px-3 rounded-xl font-bold text-sm transition ${
            selectedTeam === teamA
              ? "bg-yellow-400 text-black scale-105"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}>
          {teamA}
        </button>
        <button
          onClick={() => setSelectedTeam(teamB)}
          className={`py-4 px-3 rounded-xl font-bold text-sm transition ${
            selectedTeam === teamB
              ? "bg-yellow-400 text-black scale-105"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}>
          {teamB}
        </button>
      </div>

      {/* Quick Amounts */}
      <div>
        <p className="text-gray-400 text-xs mb-2">Quick amounts</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className={`py-2 rounded-lg text-sm font-bold transition ${
                amount === String(q)
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}>
              ₹{q.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400 font-bold">₹</span>
        <input
          type="number"
          placeholder="Custom amount..."
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gray-700 text-white pl-9 pr-4 py-3 rounded-xl outline-none border border-gray-600 focus:border-yellow-400"
        />
      </div>

      {/* Potential Win */}
      {amount && Number(amount) > 0 && (
        <div className="bg-green-900 bg-opacity-40 rounded-xl p-3 text-center border border-green-700">
          <p className="text-xs text-gray-400">Potential Win</p>
          <p className="text-xl font-bold text-green-400">
            ₹{(Number(amount) * 2).toLocaleString("en-IN")}
          </p>
        </div>
      )}

      {/* Place Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={loading || !selectedTeam || !amount}
        className="bg-yellow-400 text-black py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed">
        {loading ? "Placing..." : "Place Bet 🎲"}
      </button>
    </div>
  );
}