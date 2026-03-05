import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import ResultsPage from "./pages/ResultsPage";

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                element={<HomePage />} />
            <Route path="/room/:code"      element={<RoomPage />} />
            <Route path="/results/:code"   element={<ResultsPage />} />
          </Routes>
        </BrowserRouter>
      </RoomProvider>
    </AuthProvider>
  );
}
