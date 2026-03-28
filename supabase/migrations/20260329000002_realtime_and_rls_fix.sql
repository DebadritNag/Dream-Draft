-- Enable replica identity full for realtime row filtering
alter table public.room_members replica identity full;
alter table public.rooms replica identity full;

-- Add tables to supabase realtime publication
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.rooms;
