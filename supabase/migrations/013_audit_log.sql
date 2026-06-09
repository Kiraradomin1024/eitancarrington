-- =============================================================
-- Audit log — Wikipedia-style history of changes on content tables.
-- One row per INSERT/UPDATE/DELETE, with before/after snapshots so
-- the UI can compute a diff after the fact.
-- =============================================================

create table if not exists public.audit_log (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,        -- table name: 'npcs', 'days', 'relations', etc.
  entity_id text not null,           -- row's id as text (most are uuid)
  action text not null check (action in ('insert','update','delete')),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_recent_idx
  on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_read_all" on public.audit_log;
create policy "audit_log_read_all" on public.audit_log
  for select using (true);

-- No write policies: rows are inserted by the security-definer trigger only.

-- ---------- Trigger function ----------
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log(user_id, entity_type, entity_id, action, before, after)
    values (uid, tg_table_name, (old.id)::text, 'delete', to_jsonb(old), null);
    return old;
  elsif tg_op = 'INSERT' then
    insert into public.audit_log(user_id, entity_type, entity_id, action, before, after)
    values (uid, tg_table_name, (new.id)::text, 'insert', null, to_jsonb(new));
    return new;
  else  -- UPDATE
    if to_jsonb(old) = to_jsonb(new) then
      return new;  -- no-op update, skip
    end if;
    insert into public.audit_log(user_id, entity_type, entity_id, action, before, after)
    values (uid, tg_table_name, (new.id)::text, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  end if;
end;
$$;

-- ---------- Attach triggers ----------
drop trigger if exists trg_audit_npcs on public.npcs;
create trigger trg_audit_npcs after insert or update or delete on public.npcs
  for each row execute function public.log_audit();

drop trigger if exists trg_audit_days on public.days;
create trigger trg_audit_days after insert or update or delete on public.days
  for each row execute function public.log_audit();

drop trigger if exists trg_audit_investigations on public.investigations;
create trigger trg_audit_investigations after insert or update or delete on public.investigations
  for each row execute function public.log_audit();

drop trigger if exists trg_audit_investigation_clues on public.investigation_clues;
create trigger trg_audit_investigation_clues
  after insert or update or delete on public.investigation_clues
  for each row execute function public.log_audit();

drop trigger if exists trg_audit_relations on public.relations;
create trigger trg_audit_relations after insert or update or delete on public.relations
  for each row execute function public.log_audit();

drop trigger if exists trg_audit_issues on public.issues;
create trigger trg_audit_issues after insert or update or delete on public.issues
  for each row execute function public.log_audit();

drop trigger if exists trg_audit_character on public.character;
create trigger trg_audit_character after insert or update or delete on public.character
  for each row execute function public.log_audit();
