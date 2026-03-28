-- Allow upsert: users need update permission on their own room_members row
drop policy if exists "room_members_update" on public.room_members;

create policy "room_members_update" on public.room_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
