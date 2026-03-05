import { useState, useEffect } from "react";
import API from "../services/api";

export function useLiveScore(sport) {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await API.get(`/matches/live?sport=${sport}`);
        setMatches(res.data.matches);
      } catch (err) {
        console.error("Error fetching matches:", err);
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [sport]);

  return matches;
}
