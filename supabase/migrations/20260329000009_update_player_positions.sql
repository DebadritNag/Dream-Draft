-- Update position check constraint to match players.json positions
alter table public.players
  drop constraint if exists players_position_check;

alter table public.players
  add constraint players_position_check
  check (position in ('GK', 'CB', 'FB', 'MID', 'WING', 'ST', 'DEF', 'FWD'));
