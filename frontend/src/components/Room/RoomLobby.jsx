import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import { useSocket } from "../../hooks/useSocket";
import API from "../../services/api";
import socket from "../../services/socket";

export default function RoomLobby() {
  const { code } = useParams();
  const { user } = useAuth();
  const { room, setRoom } = useRoom();
  const [players, setPlayers] = useState([]);
  const navigate = useNavigate();

  // Fetch players on load
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await API.get(`/rooms/${code}/players`);
        setPlayers(res.data.players);
      } catch (err) {
        console.error("Error fetching players:", err);
      }
    };
    fetchPlayers();

    // Join socket room
    if (user) {
      socket.emit("join_room", { roomCode: code });
    }
  }, [code, user]);

  // Listen for new players joining
  useSocket("room_updated", () => {
    API.get(`/rooms/${code}/players`).then((res) => {
      setPlayers(res.data.players);
    });
  });

  const isHost = room?.host_id === user?.id;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8 p-6">

      {/* Room Code */}
      <div className="text-center">
        <p className="text-gray-400 mb-1">Room Code</p>
        <h1 className="text-5xl font-bold tracking-widest text-yellow-400">{code}</h1>
        <p className="text-gray-500 text-sm mt-2">Share this code with your friends!</p>
      </div>

      {/* Players List */}
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-4 text-gray-300">
          Players ({players.length})
        </h3>
        <div className="flex flex-col gap-3">
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-700 px-4 py-3 rounded-xl">
              <span className="text-2xl">{p.users?.avatar || "🐯"}</span>
              <span className="font-semibold">{p.users?.name || "Player"}</span>
              {p.user_id === room?.host_id && (
                <span className="ml-auto text-xs bg-yellow-400 text-black px-2 py-1 rounded-full font-bold">
                  HOST
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Start Button (only host sees this) */}
      {isHost && (
        <button
          onClick={() => navigate(`/room/${code}/match`)}
          className="bg-yellow-400 text-black px-10 py-4 rounded-2xl font-bold text-xl hover:bg-yellow-300 transition"
        >
          Pick a Match 🏟️
        </button>
      )}

      {!isHost && (
        <p className="text-gray-500 animate-pulse">
          Waiting for host to start the game...
        </p>
      )}
    </div>
  );
}
