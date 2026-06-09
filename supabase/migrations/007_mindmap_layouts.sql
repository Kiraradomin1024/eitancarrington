-- =============================================================
-- Per-user mindmap layouts. Each user can drag the nodes and save
-- their own positions. Doesn't affect anyone else's view.
-- =============================================================

create table if not exists public.mindmap_layouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id text not null, -- "MAIN" for the main character, otherwise the npc UUID as text
  x double precision not null,
  y double precision not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

alter table public.mindmap_layouts enable row level security;

drop policy if exists "mindmap_layouts_owner_read" on public.mindmap_layouts;
create policy "mindmap_layouts_owner_read" on public.mindmap_layouts
  for select using (auth.uid() = user_id);

drop policy if exists "mindmap_layouts_owner_insert" on public.mindmap_layouts;
create policy "mindmap_layouts_owner_insert" on public.mindmap_layouts
  for insert with check (auth.uid() = user_id);

drop policy if exists "mindmap_layouts_owner_update" on public.mindmap_layouts;
create policy "mindmap_layouts_owner_update" on public.mindmap_layouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mindmap_layouts_owner_delete" on public.mindmap_layouts;
create policy "mindmap_layouts_owner_delete" on public.mindmap_layouts
  for delete using (auth.uid() = user_id);
