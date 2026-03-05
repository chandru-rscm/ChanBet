import { createContext, useContext, useState } from "react";

const RoomContext = createContext();

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [bets, setBets] = useState([]);

  return (
    <RoomContext.Provider value={{ room, setRoom, bets, setBets }}>
      {children}
    </RoomContext.Provider>
  );
}

export const useRoom = () => useContext(RoomContext);
