alter table public.rooms
  add column if not exists max_players integer default 4,
  add column if not exists draft_format text default 'snake' check (draft_format in ('snake', 'linear'));
