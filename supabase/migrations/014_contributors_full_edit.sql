-- =============================================================
-- Open up update/delete on content tables to all contributors.
-- Previously delete required admin OR original author. With the
-- audit log in place (013), admins can revert any abuse, so we
-- accept the wider blast radius for the convenience of letting
-- contributors clean up each other's mistakes.
-- =============================================================

-- npcs
drop policy if exists "npcs_delete" on public.npcs;
create policy "npcs_delete" on public.npcs
  for delete using (public.can_contribute());

-- relations
drop policy if exists "relations_delete" on public.relations;
create policy "relations_delete" on public.relations
  for delete using (public.can_contribute());

-- days
drop policy if exists "days_delete" on public.days;
create policy "days_delete" on public.days
  for delete using (public.can_contribute());

-- investigations
drop policy if exists "inv_delete" on public.investigations;
create policy "inv_delete" on public.investigations
  for delete using (public.can_contribute());

-- issues
drop policy if exists "issues_delete" on public.issues;
create policy "issues_delete" on public.issues
  for delete using (public.can_contribute());
