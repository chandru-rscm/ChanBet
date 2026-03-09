import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";

const AVATARS = ["🐯", "🦁", "🐻", "🦊", "🐼", "🐨", "🦄", "🐸"];

const BG = {
  backgroundImage: "linear-gradient(#FFD70010 1px, transparent 1px), linear-gradient(90deg, #FFD70010 1px, transparent 1px)",
  backgroundSize: "60px 60px"
};

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
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative" style={BG}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)" }} />
      <div className="relative z-10 w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            <span className="text-5xl" style={{ color: "#FFD700" }}>CHAN</span>
            <span className="text-5xl">BET</span>
          </div>
          <p className="text-gray-500 text-xs tracking-widest mt-1" style={{ fontFamily: "monospace" }}>WHO ARE YOU?</p>
        </div>
        <label className="text-xs text-gray-500 tracking-widest mb-2 block" style={{ fontFamily: "monospace" }}>YOUR NAME</label>
        <input type="text" placeholder="Enter your name..." value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="w-full bg-black border border-gray-800 focus:border-yellow-400 text-white px-4 py-3 rounded-xl outline-none transition text-lg mb-5" />
        <label className="text-xs text-gray-500 tracking-widest mb-3 block" style={{ fontFamily: "monospace" }}>PICK YOUR AVATAR</label>
        <div className="grid grid-cols-4 gap-2 mb-8">
          {AVATARS.map((a) => (
            <button key={a} onClick={() => setAvatar(a)} className="text-3xl py-3 rounded-xl transition"
              style={{ background: avatar === a ? "#FFD700" : "#111", border: avatar === a ? "none" : "1px solid #222", transform: avatar === a ? "scale(1.1)" : "scale(1)" }}>
              {a}
            </button>
          ))}
        </div>
        <button onClick={handleLogin} disabled={loading} className="w-full py-4 rounded-xl font-black text-xl tracking-widest transition disabled:opacity-40"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "black", boxShadow: "0 4px 20px #FFD70044" }}>
          {loading ? "LOADING..." : "LET'S GO 🚀"}
        </button>
      </div>
    </div>
  );
}