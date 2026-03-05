import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-yellow-400">🏆 SportsBet</h1>
        <p className="text-gray-400 mt-2 text-lg">
          Bet on live matches with your friends!
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/room/create")}
          className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-bold text-lg hover:bg-yellow-300 transition"
        >
          🚀 Create Room
        </button>
        <button
          onClick={() => navigate("/room/join")}
          className="bg-gray-700 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-600 transition"
        >
          🔑 Join Room
        </button>
      </div>

      <div className="flex gap-6 mt-2 text-4xl">
        <span title="Cricket">🏏</span>
        <span title="Football">⚽</span>
        <span title="Basketball">🏀</span>
        <span title="Tennis">🎾</span>
      </div>
    </div>
  );
}
