-- Extend the npcs.status CHECK constraint to include 'gone' (left town)
-- and 'jailed' (in prison), now exposed in the UI (STATUS_LABELS).
alter table public.npcs drop constraint if exists npcs_status_check;
alter table public.npcs add constraint npcs_status_check
  check (status in ('alive','dead','missing','gone','jailed','unknown'));
