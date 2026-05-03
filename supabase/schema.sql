-- =============================================================
-- Eitan Carrington RP — Schema + RLS
-- Run this whole file in the Supabase SQL editor (one shot).
-- =============================================================

-- ---------- Helpers ----------
create extension if not exists "pgcrypto";

-- ---------- Profiles (mirrors auth.users) ----------
-- role:
--   'pending'     : signed up, awaiting admin approval (read-only)
--   'contributor' : whitelisted, can add/edit content
--   'admin'       : full power
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'pending' check (role in ('pending','contributor','admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  bootstrap_email text := current_setting('app.bootstrap_admin_email', true);
  initial_role text := 'pending';
begin
  -- First user OR matches bootstrap email -> admin
  if (select count(*) from public.profiles) = 0 then
    initial_role := 'admin';
  elsif bootstrap_email is not null and new.email = bootstrap_email then
    initial_role := 'admin';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, split_part(new.email, '@', 1), initial_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is current user admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Helper: is current user contributor or admin?
create or replace function public.can_contribute()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('contributor','admin') from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Main character (Eitan) ----------
create table if not exists public.character (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  bio text,
  background text,
  photo_url text,
  traits jsonb default '[]'::jsonb,
  is_main boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- NPCs (wiki) ----------
create table if not exists public.npcs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  description text,
  age int,
  family text,
  neighborhood text,
  occupation text,
  status text default 'alive' check (status in ('alive','dead','missing','unknown')),
  tags text[] default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists npcs_name_idx on public.npcs using gin (to_tsvector('french', name));

-- ---------- Relations ----------
-- source_npc_id NULL means the main character (Eitan).
create table if not exists public.relations (
  id uuid primary key default gen_random_uuid(),
  source_npc_id uuid references public.npcs(id) on delete cascade,
  target_npc_id uuid not null references public.npcs(id) on delete cascade,
  type text not null check (type in ('family','friend','enemy','romance','business','contact','rival','mentor','neighbor','colleague','other')),
  intensity int default 0 check (intensity between -5 and 5),
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Days (journal) ----------
create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  summary text,
  content text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists days_date_idx on public.days (date desc);

create table if not exists public.day_npcs (
  day_id uuid references public.days(id) on delete cascade,
  npc_id uuid references public.npcs(id) on delete cascade,
  primary key (day_id, npc_id)
);

-- ---------- Investigations ----------
create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'open' check (status in ('open','in_progress','closed','cold')),
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investigation_clues (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations(id) on delete cascade,
  content text not null,
  found_at timestamptz default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.investigation_npcs (
  investigation_id uuid references public.investigations(id) on delete cascade,
  npc_id uuid references public.npcs(id) on delete cascade,
  role text default 'suspect' check (role in ('suspect','witness','victim','informant','accomplice','other')),
  primary key (investigation_id, npc_id)
);

-- ---------- Issues (soucis du perso) ----------
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active','resolved','paused')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Seed Eitan ----------
insert into public.character (name, age, bio, background, traits, is_main)
select
  'Eitan Carrington',
  21,
  'Dernier né de la famille Carrington. Vit à Richman Lane mais ne se reconnait pas dans les délires de sa famille et des autres bourgeois du quartier.',
  'Famille juive aisée. Mère : Blair Carrington. Frère : Elias Carrington.',
  '["en rupture avec sa famille","Richman Lane","21 ans"]'::jsonb,
  true
where not exists (select 1 from public.character where is_main = true);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles            enable row level security;
alter table public.character           enable row level security;
alter table public.npcs                enable row level security;
alter table public.relations           enable row level security;
alter table public.days                enable row level security;
alter table public.day_npcs            enable row level security;
alter table public.investigations      enable row level security;
alter table public.investigation_clues enable row level security;
alter table public.investigation_npcs  enable row level security;
alter table public.issues              enable row level security;

-- ---------- Profiles policies ----------
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles_self_update_displayname" on public.profiles;
create policy "profiles_self_update_displayname" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- ---------- Generic policy generator ----------
-- Public read for all content tables; contributor write; admin override.

-- character
drop policy if exists "character_read" on public.character;
create policy "character_read" on public.character for select using (true);
drop policy if exists "character_admin_write" on public.character;
create policy "character_admin_write" on public.character for all using (public.is_admin()) with check (public.is_admin());

-- npcs
drop policy if exists "npcs_read" on public.npcs;
create policy "npcs_read" on public.npcs for select using (true);
drop policy if exists "npcs_insert" on public.npcs;
create policy "npcs_insert" on public.npcs for insert with check (public.can_contribute());
drop policy if exists "npcs_update" on public.npcs;
create policy "npcs_update" on public.npcs for update using (public.can_contribute()) with check (public.can_contribute());
drop policy if exists "npcs_delete" on public.npcs;
create policy "npcs_delete" on public.npcs for delete using (public.is_admin() or created_by = auth.uid());

-- relations
drop policy if exists "relations_read" on public.relations;
create policy "relations_read" on public.relations for select using (true);
drop policy if exists "relations_insert" on public.relations;
create policy "relations_insert" on public.relations for insert with check (public.can_contribute());
drop policy if exists "relations_update" on public.relations;
create policy "relations_update" on public.relations for update using (public.can_contribute()) with check (public.can_contribute());
drop policy if exists "relations_delete" on public.relations;
create policy "relations_delete" on public.relations for delete using (public.is_admin() or created_by = auth.uid());

-- days
drop policy if exists "days_read" on public.days;
create policy "days_read" on public.days for select using (true);
drop policy if exists "days_insert" on public.days;
create policy "days_insert" on public.days for insert with check (public.can_contribute());
drop policy if exists "days_update" on public.days;
create policy "days_update" on public.days for update using (public.can_contribute()) with check (public.can_contribute());
drop policy if exists "days_delete" on public.days;
create policy "days_delete" on public.days for delete using (public.is_admin() or created_by = auth.uid());

-- day_npcs (junction)
drop policy if exists "day_npcs_read" on public.day_npcs;
create policy "day_npcs_read" on public.day_npcs for select using (true);
drop policy if exists "day_npcs_write" on public.day_npcs;
create policy "day_npcs_write" on public.day_npcs for all using (public.can_contribute()) with check (public.can_contribute());

-- investigations
drop policy if exists "inv_read" on public.investigations;
create policy "inv_read" on public.investigations for select using (true);
drop policy if exists "inv_insert" on public.investigations;
create policy "inv_insert" on public.investigations for insert with check (public.can_contribute());
drop policy if exists "inv_update" on public.investigations;
create policy "inv_update" on public.investigations for update using (public.can_contribute()) with check (public.can_contribute());
drop policy if exists "inv_delete" on public.investigations;
create policy "inv_delete" on public.investigations for delete using (public.is_admin() or created_by = auth.uid());

-- investigation_clues
drop policy if exists "clues_read" on public.investigation_clues;
create policy "clues_read" on public.investigation_clues for select using (true);
drop policy if exists "clues_write" on public.investigation_clues;
create policy "clues_write" on public.investigation_clues for all using (public.can_contribute()) with check (public.can_contribute());

-- investigation_npcs
drop policy if exists "inv_npcs_read" on public.investigation_npcs;
create policy "inv_npcs_read" on public.investigation_npcs for select using (true);
drop policy if exists "inv_npcs_write" on public.investigation_npcs;
create policy "inv_npcs_write" on public.investigation_npcs for all using (public.can_contribute()) with check (public.can_contribute());

-- issues
drop policy if exists "issues_read" on public.issues;
create policy "issues_read" on public.issues for select using (true);
drop policy if exists "issues_insert" on public.issues;
create policy "issues_insert" on public.issues for insert with check (public.can_contribute());
drop policy if exists "issues_update" on public.issues;
create policy "issues_update" on public.issues for update using (public.can_contribute()) with check (public.can_contribute());
drop policy if exists "issues_delete" on public.issues;
create policy "issues_delete" on public.issues for delete using (public.is_admin() or created_by = auth.uid());

-- ---------- Storage bucket for photos ----------
-- Run once: creates a public bucket "media".
insert into storage.buckets (id, name, public)
values ('media','media', true)
on conflict (id) do nothing;

drop policy if exists "media_read" on storage.objects;
create policy "media_read" on storage.objects for select using (bucket_id = 'media');

drop policy if exists "media_write" on storage.objects;
create policy "media_write" on storage.objects for insert
  with check (bucket_id = 'media' and public.can_contribute());

drop policy if exists "media_update" on storage.objects;
create policy "media_update" on storage.objects for update
  using (bucket_id = 'media' and public.can_contribute());

drop policy if exists "media_delete" on storage.objects;
create policy "media_delete" on storage.objects for delete
  using (bucket_id = 'media' and (public.is_admin() or owner = auth.uid()));
