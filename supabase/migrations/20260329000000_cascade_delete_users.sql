-- Allow auth.users deletion by cascading or nullifying FK references

-- rooms.host_id → SET NULL (room can survive without a host)
alter table public.rooms
  drop constraint rooms_host_id_fkey,
  add constraint rooms_host_id_fkey
    foreign key (host_id) references auth.users(id) on delete set null;

-- room_members.user_id → CASCADE (remove member when user deleted)
alter table public.room_members
  drop constraint room_members_user_id_fkey,
  add constraint room_members_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- trivia_responses.user_id → CASCADE
alter table public.trivia_responses
  drop constraint trivia_responses_user_id_fkey,
  add constraint trivia_responses_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- draft_picks.user_id → CASCADE
alter table public.draft_picks
  drop constraint draft_picks_user_id_fkey,
  add constraint draft_picks_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- user_profiles.id → CASCADE
alter table public.user_profiles
  drop constraint user_profiles_id_fkey,
  add constraint user_profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;
