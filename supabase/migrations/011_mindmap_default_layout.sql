-- =============================================================
-- Allow anyone (including anon) to read the layout saved by the
-- "default layout" user. The mindmap page falls back to this layout
-- when the current viewer hasn't saved their own arrangement.
-- =============================================================

drop policy if exists "mindmap_layouts_default_read" on public.mindmap_layouts;
create policy "mindmap_layouts_default_read" on public.mindmap_layouts
  for select using (user_id = '5052d3be-d8da-405f-940a-de0fab67a497'::uuid);
