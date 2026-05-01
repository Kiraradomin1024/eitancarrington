-- Add a Twitch username to NPCs so we can credit which streamer plays them.
alter table public.npcs
  add column if not exists twitch_username text;
