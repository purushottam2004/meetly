--IDEMPOTENT
-- First-run basics screen: stamp this when the user taps Continue so it
-- never auto-shows again. Established profiles (already public, or already
-- have a role) are treated as done so they are not pulled back into setup.

alter table public.users
  add column if not exists basics_completed_at timestamptz;

update public.users
set basics_completed_at = coalesce(updated_at, now())
where basics_completed_at is null
  and (is_active or coalesce(trim(headline), '') <> '');
