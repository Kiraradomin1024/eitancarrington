-- Add Twitch username to the main character (Eitan)
alter table public.character
  add column if not exists twitch_username text;
