-- =============================================================
-- Public user profiles: optional avatar and short bio that
-- show on /u/[id] and next to authorship lines in feeds.
--
-- Email and role stay private. We expose a `public_profiles` view
-- with only the safe columns; the underlying table keeps its
-- strict self-read RLS.
-- =============================================================

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text;

-- Public read view — only the columns safe to expose.
create or replace view public.public_profiles as
  select id, display_name, avatar_url, bio
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;
