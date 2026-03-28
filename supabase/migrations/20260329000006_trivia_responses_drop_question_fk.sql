-- Drop the FK constraint so we can store local question IDs (not DB UUIDs)
alter table public.trivia_responses
  drop constraint if exists trivia_responses_question_id_fkey;

-- Make question_id a plain text field
alter table public.trivia_responses
  alter column question_id type text using question_id::text;
