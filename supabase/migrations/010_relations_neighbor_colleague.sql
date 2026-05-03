-- Extend the relations.type CHECK constraint to include 'neighbor' and 'colleague',
-- which were already exposed in the UI (RELATION_LABELS) but rejected by the DB.
alter table public.relations drop constraint if exists relations_type_check;
alter table public.relations add constraint relations_type_check
  check (type in ('family','friend','enemy','romance','business','contact','rival','mentor','neighbor','colleague','other'));
