-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- Go to: supabase.com → your project → SQL Editor
-- =============================================

-- Users table
create table users (
  id text primary key,
  name text not null,
  avatar text,
  coins integer default 1000
);

-- Rooms table
create table rooms (
  room_code text primary key,
  host_id text references users(id),
  status text default 'waiting',
  sport text,
  match_id text,
  created_at timestamp default now()
);

-- Room players (who's in which room)
create table room_players (
  id serial primary key,
  room_code text references rooms(room_code),
  user_id text references users(id)
);

-- Bets table
create table bets (
  id serial primary key,
  user_id text references users(id),
  room_code text references rooms(room_code),
  match_id text,
  bet_on text,
  amount integer,
  status text default 'pending',
  resolved_at timestamp
);
