-- Allow room members to insert their own draft picks
create policy "draft_picks_insert_member" on public.draft_picks
  for insert with check (
    auth.uid() = user_id
    and auth.uid() in (
      select user_id from public.room_members where room_id = draft_picks.room_id
    )
  );

-- Allow any room member to update the room (for advancing turns)
drop policy if exists "rooms_update" on public.rooms;
create policy "rooms_update" on public.rooms for update
  using (
    auth.uid() in (
      select user_id from public.room_members where room_id = rooms.id
    )
  );
