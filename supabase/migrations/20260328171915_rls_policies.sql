-- Enable RLS on all tables
alter table public.players enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.trivia_questions enable row level security;
alter table public.trivia_sessions enable row level security;
alter table public.trivia_responses enable row level security;
alter table public.draft_picks enable row level security;
alter table public.user_profiles enable row level security;

-- PLAYERS: anyone can read
create policy "players_read" on public.players for select using (true);

-- TRIVIA_QUESTIONS: anyone authenticated can read
create policy "trivia_questions_read" on public.trivia_questions
  for select using (auth.role() = 'authenticated');

-- USER_PROFILES: users manage their own
create policy "profiles_read" on public.user_profiles for select using (true);
create policy "profiles_insert" on public.user_profiles for insert
  with check (auth.uid() = id);
create policy "profiles_update" on public.user_profiles for update
  using (auth.uid() = id);

-- ROOMS: authenticated users can read; host can update
create policy "rooms_read" on public.rooms for select
  using (auth.role() = 'authenticated');
create policy "rooms_insert" on public.rooms for insert
  with check (auth.uid() = host_id);
create policy "rooms_update" on public.rooms for update
  using (auth.uid() = host_id);

-- ROOM_MEMBERS: members of the room can read; users insert themselves
create policy "room_members_read" on public.room_members for select
  using (auth.role() = 'authenticated');
create policy "room_members_insert" on public.room_members for insert
  with check (auth.uid() = user_id);
create policy "room_members_update" on public.room_members for update
  using (auth.uid() = user_id);

-- TRIVIA_SESSIONS: authenticated users can read
create policy "trivia_sessions_read" on public.trivia_sessions for select
  using (auth.role() = 'authenticated');

-- TRIVIA_RESPONSES: users can insert their own; can read all in same room
create policy "trivia_responses_read" on public.trivia_responses for select
  using (
    auth.uid() in (
      select user_id from public.room_members where room_id = trivia_responses.room_id
    )
  );
create policy "trivia_responses_insert" on public.trivia_responses for insert
  with check (auth.uid() = user_id);

-- DRAFT_PICKS: room members can read; users insert on their turn (enforced by edge function)
create policy "draft_picks_read" on public.draft_picks for select
  using (
    auth.uid() in (
      select user_id from public.room_members where room_id = draft_picks.room_id
    )
  );
create policy "draft_picks_insert" on public.draft_picks for insert
  with check (auth.uid() = user_id);;
