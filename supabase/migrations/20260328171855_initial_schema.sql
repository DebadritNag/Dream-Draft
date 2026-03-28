-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- PLAYERS table (the pool of draftable players)
create table public.players (
  id text primary key,
  name text not null,
  position text not null check (position in ('GK','DEF','MID','FWD')),
  rating integer not null,
  club text not null,
  image text
);

-- ROOMS table
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  host_id uuid references auth.users(id),
  status text not null default 'lobby' check (status in ('lobby','trivia','drafting','complete')),
  draft_order jsonb default '[]',
  current_turn integer default 0,
  turn_expires_at timestamptz,
  picks_per_user integer default 5,
  created_at timestamptz default now()
);

-- ROOM_MEMBERS table
create table public.room_members (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id),
  team_name text not null,
  avatar text not null default '⚽',
  draft_position integer,
  is_host boolean default false,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

-- TRIVIA_QUESTIONS table
create table public.trivia_questions (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  options jsonb not null,
  correct_answer integer not null,
  created_at timestamptz default now()
);

-- TRIVIA_SESSIONS table (one per room per game)
create table public.trivia_sessions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade,
  current_question_index integer default 0,
  question_start_time timestamptz,
  question_end_time timestamptz,
  status text default 'waiting' check (status in ('waiting','active','complete')),
  created_at timestamptz default now()
);

-- TRIVIA_RESPONSES table
create table public.trivia_responses (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade,
  session_id uuid references public.trivia_sessions(id) on delete cascade,
  user_id uuid references auth.users(id),
  question_id uuid references public.trivia_questions(id),
  selected_option integer not null,
  answered_at timestamptz default now(),
  unique(session_id, user_id, question_id)
);

-- DRAFT_PICKS table
create table public.draft_picks (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id),
  player_id text references public.players(id),
  pick_number integer not null,
  picked_at timestamptz default now(),
  unique(room_id, player_id),
  unique(room_id, user_id, pick_number)
);

-- USER_PROFILES table (public display info)
create table public.user_profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  avatar text default '⚽'
);

-- Seed players
insert into public.players (id, name, position, rating, club) values
  ('p1',  'Erling Haaland',          'FWD', 91, 'Man City'),
  ('p2',  'Kylian Mbappé',           'FWD', 91, 'Real Madrid'),
  ('p3',  'Vinícius Jr.',            'FWD', 90, 'Real Madrid'),
  ('p4',  'Rodri',                   'MID', 91, 'Man City'),
  ('p5',  'Jude Bellingham',         'MID', 89, 'Real Madrid'),
  ('p6',  'Kevin De Bruyne',         'MID', 90, 'Man City'),
  ('p7',  'Virgil van Dijk',         'DEF', 89, 'Liverpool'),
  ('p8',  'Rúben Dias',              'DEF', 88, 'Man City'),
  ('p9',  'Thibaut Courtois',        'GK',  90, 'Real Madrid'),
  ('p10', 'Alisson Becker',          'GK',  89, 'Liverpool'),
  ('p11', 'Mohamed Salah',           'FWD', 89, 'Liverpool'),
  ('p12', 'Bukayo Saka',             'FWD', 88, 'Arsenal'),
  ('p13', 'Martin Ødegaard',         'MID', 88, 'Arsenal'),
  ('p14', 'William Saliba',          'DEF', 87, 'Arsenal'),
  ('p15', 'Trent Alexander-Arnold',  'DEF', 87, 'Liverpool'),
  ('p16', 'Phil Foden',              'MID', 88, 'Man City'),
  ('p17', 'Bruno Fernandes',         'MID', 87, 'Man United'),
  ('p18', 'Marc-André ter Stegen',   'GK',  88, 'Barcelona'),
  ('p19', 'Lamine Yamal',            'FWD', 86, 'Barcelona'),
  ('p20', 'Florian Wirtz',           'MID', 87, 'Leverkusen');

-- Seed trivia questions
insert into public.trivia_questions (question, options, correct_answer) values
  ('Which player has won the most Ballon d''Or awards?',
   '["Cristiano Ronaldo","Lionel Messi","Michel Platini","Johan Cruyff"]', 1),
  ('Which club has won the most UEFA Champions League titles?',
   '["AC Milan","Barcelona","Real Madrid","Bayern Munich"]', 2),
  ('Who scored the ''Hand of God'' goal?',
   '["Pelé","Diego Maradona","Zinedine Zidane","Ronaldinho"]', 1),
  ('Which country won the 2022 FIFA World Cup?',
   '["France","Brazil","Argentina","Germany"]', 2),
  ('Who holds the record for most goals in a single World Cup?',
   '["Ronaldo","Just Fontaine","Gerd Müller","Miroslav Klose"]', 1);;
