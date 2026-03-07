import { useAuth } from "../context/AuthContext";
import RoomLobby from "../components/Room/RoomLobby";
import Login from "../components/Auth/Login";
import { useParams } from "react-router-dom";

export default function RoomPage() {
  const { user } = useAuth();
  const { code } = useParams();

  if (!user) return <Login redirectTo={`/room/${code}`} />;

  return <RoomLobby />;
}
