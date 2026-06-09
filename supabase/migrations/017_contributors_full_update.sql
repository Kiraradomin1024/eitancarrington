-- =============================================================
-- Open up UPDATE on content tables to all contributors.
-- This was missed in 014_contributors_full_edit.sql which only
-- opened up DELETE.
-- =============================================================

-- npcs
drop policy if exists "npcs_update" on public.npcs;
create policy "npcs_update" on public.npcs
  for update using (public.can_contribute()) with check (public.can_contribute());

-- relations
drop policy if exists "relations_update" on public.relations;
create policy "relations_update" on public.relations
  for update using (public.can_contribute()) with check (public.can_contribute());

-- days
drop policy if exists "days_update" on public.days;
create policy "days_update" on public.days
  for update using (public.can_contribute()) with check (public.can_contribute());

-- investigations
drop policy if exists "inv_update" on public.investigations;
create policy "inv_update" on public.investigations
  for update using (public.can_contribute()) with check (public.can_contribute());

-- investigation_clues
drop policy if exists "clues_update" on public.investigation_clues;
create policy "clues_update" on public.investigation_clues
  for update using (public.can_contribute()) with check (public.can_contribute());

-- issues
drop policy if exists "issues_update" on public.issues;
create policy "issues_update" on public.issues
  for update using (public.can_contribute()) with check (public.can_contribute());
