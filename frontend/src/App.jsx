import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import ResultsPage from "./pages/ResultsPage";
import CreateRoom from "./components/Room/CreateRoom";
import JoinRoom from "./components/Room/JoinRoom";
import MatchBrowser from "./components/Match/MatchBrowser";
import FantasyCreate from "./pages/FantasyCreate";
import FantasyJoin from "./pages/FantasyJoin";
import TeamSplit from "./pages/TeamSplit";
import AuctionRoom from "./pages/AuctionRoom";
import SimulationPage from "./pages/SimulationPage";

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <BrowserRouter>
          <Routes>
            {/* Live Betting */}
            <Route path="/"                          element={<HomePage />} />
            <Route path="/room/create"               element={<CreateRoom />} />
            <Route path="/room/join"                 element={<JoinRoom />} />
            <Route path="/room/:code/match"          element={<MatchBrowser />} />
            <Route path="/room/:code"                element={<RoomPage />} />
            <Route path="/results/:code"             element={<ResultsPage />} />
            {/* Fantasy */}
            <Route path="/fantasy/create"            element={<FantasyCreate />} />
            <Route path="/fantasy/join"              element={<FantasyJoin />} />
            <Route path="/fantasy/:code/teams"       element={<TeamSplit />} />
            <Route path="/fantasy/:code/auction"     element={<AuctionRoom />} />
            <Route path="/fantasy/:code/simulation"  element={<SimulationPage />} />
          </Routes>
        </BrowserRouter>
      </RoomProvider>
    </AuthProvider>
  );
}