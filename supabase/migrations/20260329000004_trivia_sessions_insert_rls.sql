-- Allow room host to insert trivia sessions
create policy "trivia_sessions_insert" on public.trivia_sessions
  for insert with check (
    auth.uid() in (
      select host_id from public.rooms where id = room_id
    )
  );

-- Allow host to update trivia sessions (for question index, status)
create policy "trivia_sessions_update" on public.trivia_sessions
  for update using (
    auth.uid() in (
      select host_id from public.rooms where id = room_id
    )
  );

-- Allow authenticated users to insert trivia responses
create policy "trivia_responses_insert_auth" on public.trivia_responses
  for insert with check (auth.uid() = user_id);
