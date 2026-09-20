--IDEMPOTENT
-- Opt-in "Open to chat" signal on profiles. Off by default so it stays a
-- real signal; discover still lists people either way.
alter table public.users
  add column if not exists open_to_chat boolean not null default false;
