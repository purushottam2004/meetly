create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid not null references public.users (id) on delete cascade,
  swiped_id uuid not null references public.users (id) on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  unique (swiper_id, swiped_id)
);

create index swipes_swiper_id_idx on public.swipes (swiper_id);

alter table public.swipes enable row level security;

create policy "Users can view their own swipes"
  on public.swipes
  for select
  using (auth.uid() = swiper_id);

create policy "Users can record their own swipes"
  on public.swipes
  for insert
  with check (auth.uid() = swiper_id and swiper_id <> swiped_id);

create policy "Users can update their own swipes"
  on public.swipes
  for update
  using (auth.uid() = swiper_id)
  with check (auth.uid() = swiper_id and swiper_id <> swiped_id);

create policy "Users can delete their own swipes"
  on public.swipes
  for delete
  using (auth.uid() = swiper_id);
