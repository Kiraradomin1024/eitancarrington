-- Add a stream VOD/replay URL to journal days.
alter table public.days
  add column if not exists vod_url text;
