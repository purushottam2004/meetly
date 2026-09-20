--IDEMPOTENT
-- Copy the Google (or other OAuth) name onto public.users once, at signup.
-- This function only runs on auth.users INSERT, so a later edit to
-- display_name is never overwritten on the next login.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  google_name text;
begin
  google_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'given_name'), '')
  );

  insert into public.users (id, display_name)
  values (new.id, google_name)
  on conflict (id) do nothing;
  return new;
end;
$$;
