-- =============================================================
-- Restrict UPDATE / DELETE to admins only.
-- Contributors can still INSERT (add new content), but cannot
-- modify or delete existing content. Run once in the SQL editor.
-- =============================================================

-- ---------- npcs ----------
drop policy if exists "npcs_update" on public.npcs;
create policy "npcs_update" on public.npcs
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "npcs_delete" on public.npcs;
create policy "npcs_delete" on public.npcs
  for delete using (public.is_admin());

-- ---------- relations ----------
drop policy if exists "relations_update" on public.relations;
create policy "relations_update" on public.relations
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "relations_delete" on public.relations;
create policy "relations_delete" on public.relations
  for delete using (public.is_admin());

-- ---------- days ----------
drop policy if exists "days_update" on public.days;
create policy "days_update" on public.days
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "days_delete" on public.days;
create policy "days_delete" on public.days
  for delete using (public.is_admin());

-- ---------- day_npcs (junction) ----------
drop policy if exists "day_npcs_write" on public.day_npcs;
create policy "day_npcs_insert" on public.day_npcs
  for insert with check (public.can_contribute());
create policy "day_npcs_delete" on public.day_npcs
  for delete using (public.is_admin());

-- ---------- investigations ----------
drop policy if exists "inv_update" on public.investigations;
create policy "inv_update" on public.investigations
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "inv_delete" on public.investigations;
create policy "inv_delete" on public.investigations
  for delete using (public.is_admin());

-- ---------- investigation_clues ----------
drop policy if exists "clues_write" on public.investigation_clues;
create policy "clues_insert" on public.investigation_clues
  for insert with check (public.can_contribute());
create policy "clues_update" on public.investigation_clues
  for update using (public.is_admin()) with check (public.is_admin());
create policy "clues_delete" on public.investigation_clues
  for delete using (public.is_admin());

-- ---------- investigation_npcs (junction) ----------
drop policy if exists "inv_npcs_write" on public.investigation_npcs;
create policy "inv_npcs_insert" on public.investigation_npcs
  for insert with check (public.can_contribute());
create policy "inv_npcs_delete" on public.investigation_npcs
  for delete using (public.is_admin());

-- ---------- issues ----------
drop policy if exists "issues_update" on public.issues;
create policy "issues_update" on public.issues
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "issues_delete" on public.issues;
create policy "issues_delete" on public.issues
  for delete using (public.is_admin());

-- ---------- Storage (media bucket) ----------
-- Contributors can still upload images; only admins can replace/delete.
drop policy if exists "media_update" on storage.objects;
create policy "media_update" on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_delete" on storage.objects;
create policy "media_delete" on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());
