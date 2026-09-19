create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profile_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('photo', 'text')),
  body text,
  photo_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profile_items_user_id_position_idx
  on public.profile_items (user_id, position);

create trigger profile_items_set_updated_at
  before update on public.profile_items
  for each row
  execute function public.set_updated_at();

alter table public.profile_items enable row level security;

create policy "Anyone can view profile items"
  on public.profile_items
  for select
  using (true);

create policy "Users can insert their own profile items"
  on public.profile_items
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile items"
  on public.profile_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own profile items"
  on public.profile_items
  for delete
  using (auth.uid() = user_id);
