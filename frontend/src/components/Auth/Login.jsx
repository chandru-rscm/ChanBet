import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";

const AVATARS = ["🐯", "🦁", "🐻", "🦊", "🐼", "🐨", "🦄", "🐸"];

export default function Login({ redirectTo }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🐯");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!name.trim()) return alert("Enter your name bro!");
    setLoading(true);
    try {
      const userId = name.toLowerCase().replace(/\s/g, "_") + "_" + Date.now();
      const res = await API.post("/auth/login", { userId, name, avatar });
      login(res.data.user);
      navigate(redirectTo || "/");
    } catch (err) {
      alert("Something went wrong, try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6">
      <h2 className="text-4xl font-bold text-yellow-400">👤 Who are you?</h2>

      {/* Name Input */}
      <input
        type="text"
        placeholder="Enter your name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-gray-800 text-white px-6 py-3 rounded-xl text-lg w-72 outline-none border border-gray-600 focus:border-yellow-400"
      />

      {/* Avatar Picker */}
      <div>
        <p className="text-gray-400 text-center mb-3">Pick your avatar</p>
        <div className="flex gap-3 flex-wrap justify-center">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`text-3xl p-2 rounded-xl transition ${
                avatar === a
                  ? "bg-yellow-400 scale-110"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-yellow-400 text-black px-10 py-3 rounded-2xl font-bold text-lg hover:bg-yellow-300 transition disabled:opacity-50"
      >
        {loading ? "Loading..." : "Let's Go 🚀"}
      </button>
    </div>
  );
}
