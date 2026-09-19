alter table public.users
  add column age integer,
  add column headline text,
  add column avatar_url text,
  add column location_text text,
  add column latitude double precision,
  add column longitude double precision,
  add column linkedin_url text,
  add column instagram_url text,
  add column twitter_url text;

-- Discover must be browsable by anonymous visitors, so profile reads are public.
drop policy "Users can view their own profile" on public.users;

create policy "Anyone can view profiles"
  on public.users
  for select
  using (true);
