-- =============================================================
-- Drop the 'neighbor' relation type. Existing rows are deleted.
-- =============================================================

delete from public.relations where type = 'neighbor';

alter table public.relations drop constraint if exists relations_type_check;
alter table public.relations add constraint relations_type_check
  check (type in ('family','friend','enemy','romance','business','contact','rival','mentor','colleague','other'));
