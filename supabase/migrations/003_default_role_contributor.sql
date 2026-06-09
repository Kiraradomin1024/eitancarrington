-- =============================================================
-- Make every new account a "contributor" by default.
-- The first user (or the bootstrap admin email) is still made admin.
-- Existing "pending" profiles are also promoted to "contributor".
-- Run once in the Supabase SQL editor.
-- =============================================================

-- Update the auto-create-profile trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  bootstrap_email text := current_setting('app.bootstrap_admin_email', true);
  initial_role text := 'contributor';
begin
  -- First user OR matches bootstrap email -> admin
  if (select count(*) from public.profiles) = 0 then
    initial_role := 'admin';
  elsif bootstrap_email is not null and new.email = bootstrap_email then
    initial_role := 'admin';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, split_part(new.email, '@', 1), initial_role);
  return new;
end;
$$;

-- Promote existing "pending" accounts to "contributor"
update public.profiles
set role = 'contributor'
where role = 'pending';
