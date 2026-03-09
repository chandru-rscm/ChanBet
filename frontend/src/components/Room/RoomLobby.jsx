import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import { useSocket } from "../../hooks/useSocket";
import API from "../../services/api";
import socket from "../../services/socket";

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

export default function RoomLobby() {
  const { code } = useParams();
  const { user } = useAuth();
  const { room } = useRoom();
  const [players, setPlayers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await API.get(`/rooms/${code}/players`);
        setPlayers(res.data.players);
      } catch (err) { console.error(err); }
    };
    fetchPlayers();
    if (user) socket.emit("join_room", { roomCode: code });
  }, [code, user]);

  useSocket("room_updated", () => {
    API.get(`/rooms/${code}/players`).then((res) => setPlayers(res.data.players));
  });

  const isHost = room?.host_id === user?.id;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative" style={BG}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm fade-in">
        {/* Room Code */}
        <div className="text-center mb-8">
          <p className="text-xs text-gray-600 tracking-widest mb-2" style={{ fontFamily: "monospace" }}>ROOM CODE</p>
          <div className="text-6xl font-black tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700", textShadow: "0 0 30px #FFD70066" }}>
            {code}
          </div>
          <p className="text-xs text-gray-600 mt-2" style={{ fontFamily: "monospace" }}>SHARE THIS WITH YOUR SQUAD</p>
        </div>

        {/* Players */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: "#111", border: "1px solid #222" }}>
          <p className="text-xs text-gray-600 tracking-widest mb-4" style={{ fontFamily: "monospace" }}>
            PLAYERS ({players.length})
          </p>
          <div className="flex flex-col gap-2">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#1a1a1a" }}>
                <span className="text-2xl">{p.users?.avatar || "🐯"}</span>
                <span className="font-bold">{p.users?.name || "Player"}</span>
                {p.user_id === room?.host_id && (
                  <span className="ml-auto text-xs px-2 py-1 rounded-full font-black tracking-wider"
                    style={{ fontFamily: "monospace", background: "#FFD700", color: "black" }}>HOST</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <button onClick={() => navigate(`/room/${code}/match`)}
            className="w-full py-4 rounded-xl font-black text-xl tracking-widest transition"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black", boxShadow: "0 4px 20px #FFD70044" }}>
            PICK A MATCH 🏟️
          </button>
        ) : (
          <p className="text-center text-xs text-gray-600 live-pulse" style={{ fontFamily: "monospace" }}>
            ● WAITING FOR HOST TO START...
          </p>
        )}
      </div>
    </div>
  );
}
