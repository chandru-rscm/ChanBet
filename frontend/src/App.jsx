import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import ResultsPage from "./pages/ResultsPage";
import CreateRoom from "./components/Room/CreateRoom";
import JoinRoom from "./components/Room/JoinRoom";
import MatchBrowser from "./components/Match/MatchBrowser";

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                      element={<HomePage />} />
            <Route path="/room/create"           element={<CreateRoom />} />
            <Route path="/room/join"             element={<JoinRoom />} />
            {/* ⚠️ More specific routes MUST come before /:code */}
            <Route path="/room/:code/match"      element={<MatchBrowser />} />
            <Route path="/room/:code"            element={<RoomPage />} />
            <Route path="/results/:code"         element={<ResultsPage />} />
          </Routes>
        </BrowserRouter>
      </RoomProvider>
    </AuthProvider>
  );
}