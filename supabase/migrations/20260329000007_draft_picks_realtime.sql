-- Add draft_picks to realtime publication so INSERT events fire
alter publication supabase_realtime add table public.draft_picks;
alter table public.draft_picks replica identity full;
