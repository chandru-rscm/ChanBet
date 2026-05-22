-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- Go to: supabase.com → your project → SQL Editor
-- =============================================

-- Users table
create table if not exists users (
  id text primary key,
  name text not null,
  avatar text,
  coins integer default 1000
);

-- Rooms table (with missing team_a and team_b columns added)
create table if not exists rooms (
  room_code text primary key,
  host_id text references users(id),
  status text default 'waiting',
  sport text,
  match_id text,
  team_a text,
  team_b text,
  created_at timestamp default now()
);

-- Room players (who's in which room)
create table if not exists room_players (
  id serial primary key,
  room_code text references rooms(room_code) on delete cascade,
  user_id text references users(id) on delete cascade
);

-- Bets table
create table if not exists bets (
  id serial primary key,
  user_id text references users(id) on delete cascade,
  room_code text references rooms(room_code) on delete cascade,
  match_id text,
  bet_on text,
  amount integer,
  status text default 'pending',
  resolved_at timestamp
);

-- ─── FANTASY & AUCTION TABLES ───────────────────────────────

-- Fantasy Rooms table
create table if not exists fantasy_rooms (
  room_code text primary key,
  host_id text references users(id),
  sport text not null,
  status text default 'waiting', -- 'waiting', 'auction', 'simulation'
  game_mode text default 'dual_franchise', -- 'dual_franchise' | 'multiplayer_league'
  team_a_name text default 'Team A',
  team_b_name text default 'Team B',
  created_at timestamp default now()
);

-- Fantasy Room Players table
create table if not exists fantasy_room_players (
  id serial primary key,
  room_code text references fantasy_rooms(room_code) on delete cascade,
  user_id text references users(id) on delete cascade,
  team text, -- 'A' or 'B' (or dynamic franchise name in league mode)
  selected_team text -- 'CSK', 'RCB', 'MI', etc.
);

-- Auction Players table
create table if not exists auction_players (
  id serial primary key,
  room_code text references fantasy_rooms(room_code) on delete cascade,
  sport text not null,
  player_name text not null,
  role text,
  overseas boolean default false,
  base_price bigint,
  stats jsonb default '{}'::jsonb,
  status text default 'pending', -- 'pending', 'active', 'sold', 'unsold'
  sold_to text, -- 'A' or 'B' or dynamic franchise name
  sold_price bigint,
  sort_order integer default 0
);

-- Auction Bids table
create table if not exists auction_bids (
  id serial primary key,
  room_code text references fantasy_rooms(room_code) on delete cascade,
  player_id integer references auction_players(id) on delete cascade,
  team text not null, -- 'A', 'B' or dynamic franchise name
  amount bigint not null,
  user_id text references users(id),
  created_at timestamp default now()
);

-- Fantasy Squads table
create table if not exists fantasy_squads (
  id serial primary key,
  room_code text references fantasy_rooms(room_code) on delete cascade,
  team text not null, -- 'A', 'B' or dynamic franchise name
  player_id integer references auction_players(id) on delete cascade,
  player_name text not null,
  role text,
  bought_for bigint not null
);


-- =============================================
-- ─── MIGRATION FOR EXISTING DATABASES ────────
-- If you already created these tables, run these lines to upgrade:
-- =============================================
-- alter table fantasy_rooms add column if not exists game_mode text default 'dual_franchise';
-- alter table fantasy_rooms add column if not exists team_a_name text default 'Team A';
-- alter table fantasy_rooms add column if not exists team_b_name text default 'Team B';
-- alter table fantasy_room_players add column if not exists selected_team text;


