-- supabase/make_admin.sql
-- Grants the first admin. RLS reads the app role via:
--   app_role() = auth.jwt() -> 'app_metadata' ->> 'user_role'
-- These statements are meant to be run in the Supabase SQL editor,
-- which executes with sufficient (service) privilege over the auth schema.

-- (a) Promote the admin user. Merge the user_role claim into raw_app_meta_data
--     (coalesce guards against a NULL meta column on older rows).
update auth.users
set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || '{"user_role":"admin"}'::jsonb
where email = 'teamq@groupquimera.com';

-- (b) IMPORTANT: app_metadata is baked into the JWT at sign-in time.
--     The change above does NOT affect any session that is already open.
--     The user MUST sign out and sign back in so a fresh JWT is issued
--     carrying app_metadata.user_role = 'admin'. Only then will app_role()
--     return 'admin' and admin-gated RLS policies / UI unlock.

-- (c) OPTIONAL: default every new signup to user_role = 'user'.
--     Without this, brand-new users have no user_role claim until promoted.
--     Run this block once; it is idempotent (drops the trigger first).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only set a default when no role was provided at creation time.
  if (new.raw_app_meta_data ->> 'user_role') is null then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"user_role":"user"}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  before insert on auth.users
  for each row
  execute function public.handle_new_user();
