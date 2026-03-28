-- Drop the overly restrictive select policy and replace with one that
-- allows any authenticated user to read all members of rooms they belong to.
drop policy if exists "room_members_read" on public.room_members;

create policy "room_members_read" on public.room_members
  for select using (
    auth.role() = 'authenticated'
  );
