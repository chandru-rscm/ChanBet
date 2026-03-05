import { createClient } from "@supabase/supabase-js";

// 🔴 Replace these with your actual Supabase project values
const SUPABASE_URL = "https://jzwbcdskrdmqsgovaxtg.supabase.co";
const SUPABASE_ANON_KEY = "YeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6d2JjZHNrcmRtcXNnb3ZheHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTA4NDQsImV4cCI6MjA4ODI4Njg0NH0.L9Z_xvxWfsH2yZ1_zhdDvfvDXvXN2mHnLebvw2Zv6wE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
