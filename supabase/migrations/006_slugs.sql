-- =============================================================
-- Add human-readable slugs to npcs, days, and investigations.
-- Old UUID-based URLs keep working — pages will look up by slug
-- first, then fall back to UUID.
-- =============================================================

create extension if not exists unaccent;

-- ---------- Add slug columns ----------
alter table public.npcs
  add column if not exists slug text;
alter table public.days
  add column if not exists slug text;
alter table public.investigations
  add column if not exists slug text;

-- ---------- Slugify helper ----------
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      lower(unaccent(coalesce(input, ''))),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- ---------- Backfill: NPCs ----------
do $$
declare
  rec record;
  base_slug text;
  final_slug text;
  counter int;
begin
  for rec in select id, name from public.npcs where slug is null or slug = '' loop
    base_slug := public.slugify(rec.name);
    if base_slug = '' then base_slug := 'perso'; end if;
    final_slug := base_slug;
    counter := 1;
    while exists (select 1 from public.npcs where slug = final_slug and id <> rec.id) loop
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    end loop;
    update public.npcs set slug = final_slug where id = rec.id;
  end loop;
end$$;

-- ---------- Backfill: Days ----------
do $$
declare
  rec record;
  base_slug text;
  final_slug text;
  counter int;
begin
  for rec in select id, day_number, title, date from public.days where slug is null or slug = '' loop
    if rec.day_number is not null then
      base_slug := 'jour-' || rec.day_number;
    else
      base_slug := public.slugify(rec.title);
      if base_slug = '' then base_slug := to_char(rec.date, 'YYYY-MM-DD'); end if;
    end if;
    final_slug := base_slug;
    counter := 1;
    while exists (select 1 from public.days where slug = final_slug and id <> rec.id) loop
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    end loop;
    update public.days set slug = final_slug where id = rec.id;
  end loop;
end$$;

-- ---------- Backfill: Investigations ----------
do $$
declare
  rec record;
  base_slug text;
  final_slug text;
  counter int;
begin
  for rec in select id, title from public.investigations where slug is null or slug = '' loop
    base_slug := public.slugify(rec.title);
    if base_slug = '' then base_slug := 'enquete'; end if;
    final_slug := base_slug;
    counter := 1;
    while exists (select 1 from public.investigations where slug = final_slug and id <> rec.id) loop
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    end loop;
    update public.investigations set slug = final_slug where id = rec.id;
  end loop;
end$$;

-- ---------- Unique indexes (allow nulls but not duplicates) ----------
create unique index if not exists npcs_slug_unique on public.npcs (slug) where slug is not null;
create unique index if not exists days_slug_unique on public.days (slug) where slug is not null;
create unique index if not exists investigations_slug_unique on public.investigations (slug) where slug is not null;
